import { Router, Request } from "express";
import crypto from "crypto";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { signToken, requireAuth, AuthRequest } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";
import { OtpCode } from "../models/OtpCode";
import { sendOtpEmail } from "../services/emailOtp";

const SUPER_ADMIN_ACCESS_CODE = process.env.SUPER_ADMIN_ACCESS_CODE || "WMH@2024";

// ─── Brute-force protection (in-memory) ─────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
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
  return loginAttempts.get(key) ?? { count: 0, lockedUntil: null, lastAttempt: 0 };
}

function isLocked(record: AttemptRecord): boolean {
  if (!record.lockedUntil) return false;
  if (Date.now() < record.lockedUntil) return true;
  // Lock expired — reset
  return false;
}

function recordFailure(key: string): AttemptRecord {
  const rec = getRecord(key);
  // If previous lock expired, reset count
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    rec.count = 0;
    rec.lockedUntil = null;
  }
  rec.count += 1;
  rec.lastAttempt = Date.now();
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(key, rec);
  return rec;
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

router.post("/auth/login", requireDb, async (req, res) => {
  try {
    const { username, email: emailId, password } = req.body;
    // Accept either "email" (from admin login) or "username" (from super admin login)
    const identifier = (emailId || username || "").trim();

    if (!identifier || !password) {
      res.status(400).json({ error: "Email/username and password are required" });
      return;
    }

    const attemptKey = getAttemptKey(req, identifier);
    const record = getRecord(attemptKey);

    // Check lockout
    if (isLocked(record)) {
      const remainingMs = (record.lockedUntil! - Date.now());
      const remainingMin = Math.ceil(remainingMs / 60000);
      res.status(429).json({
        error: `Too many failed attempts. Account locked for ${remainingMin} more minute${remainingMin !== 1 ? "s" : ""}.`,
        lockedUntil: record.lockedUntil,
      });
      return;
    }

    // Find user: try by username (super_admin path) OR by email (admin path)
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      recordFailure(attemptKey);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      const rec = recordFailure(attemptKey);
      const remaining = MAX_ATTEMPTS - rec.count;
      if (rec.lockedUntil) {
        res.status(401).json({
          error: `Invalid credentials. Account locked for 15 minutes due to too many failed attempts.`,
        });
      } else {
        res.status(401).json({
          error: `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`,
        });
      }
      return;
    }

    if (user.role === "admin" && user.isActive === false) {
      res.status(403).json({ error: "Admin is currently not-active, please contact to super-admin" });
      return;
    }

    if (user.role === "super_admin") {
      const { accessCode } = req.body;
      if (!accessCode || accessCode !== SUPER_ADMIN_ACCESS_CODE) {
        recordFailure(attemptKey);
        res.status(401).json({ error: "Invalid access code. Super admin login requires a valid secret access code." });
        return;
      }
    }

    if (user.role === "admin" && !user.multiDeviceAllowed && user.sessionId && user.sessionId !== "") {
      res.status(403).json({ error: "Multi-device not allowed from super-admin, please allow first" });
      return;
    }

    // Success — clear failed attempts
    clearFailures(attemptKey);

    const sessionId = crypto.randomUUID();
    user.sessionId = sessionId;
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
    user.sessionId = "";
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
  });
});

router.patch("/auth/change-password", requireDb, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (currentPassword) {
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
    }

    if (username) user.username = username;
    if (newPassword) {
      user.password = newPassword;
      user.plainPassword = newPassword; // keep plain copy in sync for super admin view
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
router.post("/auth/admin/forgot-password/send-otp", requireDb, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const admin = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });
    if (!admin) {
      // Don't reveal if email exists — same message for security
      res.json({ message: "If this email is registered, an OTP will be sent." }); return;
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

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    req.log.error({ err }, "Admin forgot password send OTP error");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ── Admin Forgot Password — Verify OTP & Reset Password ──────────────────────
router.post("/auth/admin/forgot-password/reset", requireDb, async (req, res) => {
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

    if (!record) { res.status(400).json({ error: "OTP expired or not found. Please request a new one." }); return; }
    if (record.code !== otp.trim()) { res.status(400).json({ error: "Incorrect OTP. Please try again." }); return; }

    const admin = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    admin.password = newPassword;
    admin.plainPassword = newPassword;
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
