import { Router } from "express";
import { StoreRequest } from "../models/StoreRequest";
import { User } from "../models/User";
import { OtpCode } from "../models/OtpCode";
import { sendCreateStoreOtpEmail } from "../services/emailOtp";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { otpRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

function fmt(s: InstanceType<typeof StoreRequest>) {
  return {
    id: String(s._id),
    _id: String(s._id),
    email: s.email,
    storeName: s.storeName,
    whatsapp: s.whatsapp,
    plan: s.plan ?? null,
    planName: s.planName ?? s.plan ?? null,
    planPrice: s.planPrice ?? null,
    planPeriod: s.planPeriod ?? null,
    planBadge: s.planBadge ?? null,
    planColor: s.planColor ?? null,
    status: s.status,
    submittedBy: s.submittedBy,
    rewardCode: s.rewardCode ?? null,
    referred_by_admin_username: s.referred_by_admin_username ?? "",
    createdAt: s.createdAt.toISOString(),
    updatedAt: (s as any).updatedAt ? new Date((s as any).updatedAt).toISOString() : s.createdAt.toISOString(),
  };
}

router.get("/store-requests/my", requireAuth, async (req: any, res) => {
  try {
    const requests = await StoreRequest.find({ submittedBy: req.user?.id }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log.error({ err }, "My store requests error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Send email OTP for store creation email verification ──
router.post("/store-requests/send-email-otp", async (req: any, res) => {
  try {
    const email = (req.body?.email ?? "").trim().toLowerCase();
    const whatsapp = (req.body?.whatsapp ?? "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }

    // ── Duplicate check before sending OTP ──
    const [emailInRequest, whatsappInRequest] = await Promise.all([
      StoreRequest.findOne({ email, status: { $in: ["pending", "approved"] } }).lean(),
      whatsapp
        ? StoreRequest.findOne({ whatsapp, status: { $in: ["pending", "approved"] } }).lean()
        : null,
    ]);

    if (emailInRequest) {
      res.status(409).json({ error: "This email is already registered. Please use a different email." });
      return;
    }

    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      res.status(409).json({ error: "This email is already registered. Please use a different email." });
      return;
    }

    if (whatsappInRequest) {
      res.status(409).json({ error: "This WhatsApp number is already registered. Please use a different number." });
      return;
    }

    // Rate-limit: max 3 OTPs per email per 10 minutes
    const recentCount = await OtpCode.countDocuments({
      email,
      purpose: "signup",
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (recentCount >= 3) {
      res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes." });
      return;
    }

    // Invalidate old unused OTPs for this email
    await OtpCode.updateMany({ email, purpose: "signup", used: false }, { used: true });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await OtpCode.create({ email, storeId: "", code, purpose: "signup", expiresAt, used: false });

    await sendCreateStoreOtpEmail({ toEmail: email, otp: code });

    res.json({ sent: true });
  } catch (err) {
    req.log?.error?.({ err }, "send-email-otp error");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// ── Verify email OTP for store creation ──
router.post("/store-requests/verify-email-otp", otpRateLimiter, async (req: any, res) => {
  try {
    const email = (req.body?.email ?? "").trim().toLowerCase();
    const code  = (req.body?.code  ?? "").trim();

    if (!email || !code) {
      res.status(400).json({ error: "Email and code required" });
      return;
    }

    const record = await OtpCode.findOne({
      email,
      purpose: "signup",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
      return;
    }
    if (record.code !== code) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." });
      return;
    }

    record.used = true;
    record.verified = true;
    await record.save();

    res.json({ verified: true });
  } catch (err) {
    req.log?.error?.({ err }, "verify-email-otp error");
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ── Duplicate check: called before step 2 → step 3 on the Create Store form ──
router.post("/store-requests/check-duplicate", async (req: any, res) => {
  try {
    const email = (req.body?.email ?? "").trim().toLowerCase();
    const whatsapp = (req.body?.whatsapp ?? "").trim();

    // Check StoreRequest collection (any non-rejected request counts as taken)
    const [emailRequest, whatsappRequest] = await Promise.all([
      email
        ? StoreRequest.findOne({ email, status: { $in: ["pending", "approved"] } }).lean()
        : null,
      whatsapp
        ? StoreRequest.findOne({ whatsapp, status: { $in: ["pending", "approved"] } }).lean()
        : null,
    ]);

    if (emailRequest) {
      res.json({ emailTaken: true, whatsappTaken: false });
      return;
    }
    if (whatsappRequest) {
      res.json({ emailTaken: false, whatsappTaken: true });
      return;
    }

    // Also check User collection in case the store was already created
    // Only flag store-owner accounts (role: "admin"), not super_admin system accounts
    const existingUser = email
      ? await User.findOne({ email, role: { $ne: "super_admin" } }).select("_id").lean()
      : null;

    if (existingUser) {
      res.json({ emailTaken: true, whatsappTaken: false });
      return;
    }

    res.json({ emailTaken: false, whatsappTaken: false });
  } catch (err) {
    req.log?.error?.({ err }, "check-duplicate error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin referral history (stores created via this admin's referral link) ──
router.get("/store-requests/my-referrals", requireAuth, async (req: any, res) => {
  try {
    const adminUser = await User.findById(req.user?.id).select("username").lean() as any;
    if (!adminUser?.username) {
      res.json([]);
      return;
    }
    const requests = await StoreRequest.find({
      referred_by_admin_username: adminUser.username,
    }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log?.error?.({ err }, "My referrals error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Super admin: all admin-to-admin referral history ──
router.get("/store-requests/referral-history", requireSuperAdmin, async (req: any, res) => {
  try {
    const requests = await StoreRequest.find({
      referred_by_admin_username: { $ne: "", $exists: true },
    }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log?.error?.({ err }, "Referral history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
