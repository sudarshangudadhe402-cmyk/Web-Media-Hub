import { Router, Request } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { signToken, requireAuth, AuthRequest } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";
import { OtpCode } from "../models/OtpCode";
import { sendOtpEmail, sendLockoutEmail } from "../services/emailOtp";
import { authRateLimiter, loginStrictLimiter, otpRateLimiter } from "../middlewares/rateLimiter";
import { validate } from "../middlewares/validate";
import {
  AdminLoginSchema,
  ChangePasswordSchema,
  ForgotPasswordSendOtpSchema,
  ForgotPasswordResetSchema,
} from "../schemas/authSchemas";

const SUPER_ADMIN_ACCESS_CODE = process.env.SUPER_ADMIN_ACCESS_CODE;
if (!SUPER_ADMIN_ACCESS_CODE) throw new Error("SUPER_ADMIN_ACCESS_CODE env var is required");

// ─── Brute-force protection with progressive delay (in-memory) ───────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Progressive delay per attempt number (seconds): 0, 5, 15, 30, lockout
const PROGRESSIVE_DELAY_S = [0, 0, 5, 15, 30];

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  retryAfterMs: number;   // progressive delay before next attempt allowed
  lastAttempt: number;
  lockoutEmailSent: boolean;
}

const loginAttempts = new Map<string, AttemptRecord>();

function getAttemptKey(req: Request, identifier: string): string {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${ip}::${identifier.toLowerCase()}`;
}

function getRecord(key: string): AttemptRecord {
  return loginAttempts.get(key) ?? {
    count: 0, lockedUntil: null, retryAfterMs: 0, lastAttempt: 0, lockoutEmailSent: false,
  };
}

function isLocked(record: AttemptRecord): boolean {
  return !!record.lockedUntil && Date.now() < record.lockedUntil;
}

/** Returns the record after recording a failure.
 *  `justLocked` is true only on the attempt that first triggers lockout. */
function recordFailure(key: string): { rec: AttemptRecord; justLocked: boolean } {
  const rec = getRecord(key);
  // Reset expired lockout
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    rec.count = 0;
    rec.lockedUntil = null;
    rec.retryAfterMs = 0;
    rec.lockoutEmailSent = false;
  }
  rec.count += 1;
  rec.lastAttempt = Date.now();
  const justLocked = rec.count >= MAX_ATTEMPTS && !rec.lockedUntil;
  if (justLocked) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.retryAfterMs = LOCKOUT_MS;
  } else {
    const delayS = PROGRESSIVE_DELAY_S[Math.min(rec.count, PROGRESSIVE_DELAY_S.length - 1)] ?? 30;
    rec.retryAfterMs = delayS * 1000;
  }
  loginAttempts.set(key, rec);
  return { rec, justLocked };
}

function clearFailures(key: string): void {
  loginAttempts.delete(key);
}

// Cleanup stale records every hour
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, rec] of loginAttempts.entries()) {
    if (rec.lastAttempt < cutoff) loginAttempts.delete(key);
  }
}, 60 * 60 * 1000);
// ────────────────────────────────────────────────────────────────────────────

const router = Router();

router.post("/auth/login", loginStrictLimiter, validate(AdminLoginSchema), requireDb, async (req, res) => {
  try {
    const { username, email: emailId, password } = req.body;
    const identifier = (emailId || username || "").trim();

    if (!identifier || !password) {
      res.status(400).json({ error: "Email/username and password are required" });
      return;
    }

    const attemptKey = getAttemptKey(req, identifier);
    const record = getRecord(attemptKey);

    if (isLocked(record)) {
      const remainingMs = record.lockedUntil! - Date.now();
      res
        .status(429)
        .set("Retry-After", String(Math.ceil(remainingMs / 1000)))
        .json({ error: "Incorrect email or password." });
      return;
    }

    // Enforce progressive delay from previous failed attempt
    if (record.retryAfterMs > 0) {
      const timeSinceLast = Date.now() - record.lastAttempt;
      if (timeSinceLast < record.retryAfterMs) {
        const waitS = Math.ceil((record.retryAfterMs - timeSinceLast) / 1000);
        res
          .status(429)
          .set("Retry-After", String(waitS))
          .json({ error: "Incorrect email or password.", retryAfterSeconds: waitS });
        return;
      }
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      // Still track failure to prevent username enumeration via timing
      recordFailure(attemptKey);
      res.status(401).json({ error: "Incorrect email or password." });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      const { rec, justLocked } = recordFailure(attemptKey);

      if (justLocked && user.email && !rec.lockoutEmailSent) {
        rec.lockoutEmailSent = true;
        loginAttempts.set(attemptKey, rec);
        // Fire-and-forget — do not block response on email delivery
        sendLockoutEmail(user.email, user.username, new Date(rec.lockedUntil!)).catch(() => {});
      }

      const retryAfterS = rec.retryAfterMs > 0 ? Math.ceil(rec.retryAfterMs / 1000) : undefined;
      res
        .status(401)
        .set("Retry-After", retryAfterS ? String(retryAfterS) : "0")
        .json({
          error: "Incorrect email or password.",
          ...(retryAfterS ? { retryAfterSeconds: retryAfterS } : {}),
        });
      return;
    }

    if (user.role === "admin" && user.isActive === false) {
      const now = new Date();
      const isSubscriptionExpired =
        user.subscriptionEndDate instanceof Date && user.subscriptionEndDate < now;
      if (!isSubscriptionExpired) {
        res.status(403).json({ error: "Admin is currently not-active, please contact to super-admin" });
        return;
      }
      // Subscription expired — allow login so they can reach the plan renewal page
    }

    if (user.role === "super_admin") {
      const { accessCode } = req.body;
      if (!accessCode || accessCode !== SUPER_ADMIN_ACCESS_CODE) {
        const { rec: saRec, justLocked: saJustLocked } = recordFailure(attemptKey);
        if (saJustLocked && user.email && !saRec.lockoutEmailSent) {
          saRec.lockoutEmailSent = true;
          loginAttempts.set(attemptKey, saRec);
          sendLockoutEmail(user.email, user.username, new Date(saRec.lockedUntil!)).catch(() => {});
        }
        res.status(401).json({ error: "Incorrect email or password." });
        return;
      }
    }

    clearFailures(attemptKey);

    // Lazy cost-factor upgrade — fire-and-forget, does not block login response
    if (user.needsRehash()) {
      bcrypt.hash(password, 12)
        .then((newHash) => User.updateOne({ _id: user._id }, { $set: { password: newHash } }))
        .catch(() => {});
    }

    const sessionId = crypto.randomUUID();

    if (!user.activeSessions) user.activeSessions = [];
    user.activeSessions.push({ sessionId, loginAt: new Date() });
    await user.save();

    const token = signToken(String(user._id), sessionId, user.role);
    res.json({
      token,
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email ?? "",
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", requireDb, requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.split(" ")[1];

    let sessionIdToRemove: string | undefined;
    try {
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.decode(token) as { sessionId?: string } | null;
      sessionIdToRemove = decoded?.sessionId;
    } catch {
      // ignore decode errors
    }

    if (sessionIdToRemove) {
      user.activeSessions = (user.activeSessions ?? []).filter((s) => s.sessionId !== sessionIdToRemove);
    } else {
      user.activeSessions = [];
    }
    await user.save();
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireDb, requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  let storeName: string | null = null;
  if (user.role === "admin") {
    const store = await Store.findOne({ ownerId: String(user._id) }).select("name");
    storeName = store?.name ?? null;
  }
  res.json({
    id: String(user._id),
    username: user.username,
    email: user.email ?? "",
    role: user.role,
    createdAt: user.createdAt,
    storeName,
    planName: user.planName ?? "",
    planPrice: user.planPrice ?? "",
    planPeriod: user.planPeriod ?? "",
    planBadge: user.planBadge ?? "",
    planColor: user.planColor ?? "",
    subscriptionStartDate: user.subscriptionStartDate ? user.subscriptionStartDate.toISOString() : null,
    subscriptionEndDate: user.subscriptionEndDate ? user.subscriptionEndDate.toISOString() : null,
    autopayStatus: user.autopayStatus ?? "none",
    razorpaySubscriptionId: user.razorpaySubscriptionId ?? "",
  });
});

router.patch("/auth/change-password", requireDb, requireAuth, validate(ChangePasswordSchema), async (req: AuthRequest, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (currentPassword) {
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        res.status(400).json({ error: "Incorrect current password." });
        return;
      }
    }

    if (username) user.username = username;
    if (newPassword) {
      user.password = newPassword;
    }
    await user.save();

    res.json({
      id: String(user._id),
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin Forgot Password — Send OTP ─────────────────────────────────────────
router.post("/auth/admin/forgot-password/send-otp", otpRateLimiter, validate(ForgotPasswordSendOtpSchema), requireDb, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const admin = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });
    if (!admin) {
      // Don't reveal if email exists — same message for security
      res.json({ message: "If that email is registered, you'll receive a reset link." }); return;
    }

    // Rate limit: max 3 OTPs per email in 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await OtpCode.countDocuments({
      email: email.trim().toLowerCase(),
      purpose: "admin-forgot-password",
      createdAt: { $gte: tenMinAgo },
    });
    if (recentCount >= 3) {
      res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes." }); return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({ email: email.trim().toLowerCase(), storeId: "admin", code, purpose: "admin-forgot-password", expiresAt });
    await sendOtpEmail(email.trim(), code, "Web Media Hub", "admin-forgot-password");

    res.json({ message: "If that email is registered, you'll receive a reset link." });
  } catch (err) {
    req.log.error({ err }, "Admin forgot password send OTP error");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ── Admin Forgot Password — Verify OTP & Reset Password ──────────────────────
router.post("/auth/admin/forgot-password/reset", authRateLimiter, validate(ForgotPasswordResetSchema), requireDb, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: "Email, OTP and new password are required" }); return;
    }

    if (!/^\d+$/.test(newPassword) || newPassword.length < 4) {
      res.status(400).json({ error: "Password must be numbers only (minimum 4 digits)" }); return;
    }

    const record = await OtpCode.findOne({
      email: email.trim().toLowerCase(),
      purpose: "admin-forgot-password",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) { res.status(400).json({ error: "Invalid or expired code. Please request a new one." }); return; }
    const trimmedOtp = otp.trim();
    // Length check MUST come before timingSafeEqual — buffers of different lengths cause a crash
    if (trimmedOtp.length !== record.code.length) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." }); return;
    }
    const otpMatch = crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(trimmedOtp));
    if (!otpMatch) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." }); return;
    }

    const admin = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });
    if (!admin) { res.status(400).json({ error: "Invalid or expired code. Please request a new one." }); return; }

    admin.password = newPassword;
    await admin.save();

    record.used = true;
    await record.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin forgot password reset error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
