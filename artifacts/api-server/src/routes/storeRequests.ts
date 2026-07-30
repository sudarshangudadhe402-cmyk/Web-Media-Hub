import { Router } from "express";
import { User } from "../models/User";
import { OtpCode } from "../models/OtpCode";
import { sendCreateStoreOtpEmail } from "../services/emailOtp";
import { otpRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// ── Send email OTP for store creation email verification ──
router.post("/store-requests/send-email-otp", async (req: any, res) => {
  try {
    const email = (req.body?.email ?? "").trim().toLowerCase();
    const whatsapp = (req.body?.whatsapp ?? "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid email required" });
      return;
    }

    // Check if email is already a registered store
    const existingUser = await User.findOne({ email, role: { $ne: "super_admin" } }).select("_id").lean();
    if (existingUser) {
      res.status(409).json({ error: "This email is already registered. Please use a different email." });
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

    // Only flag store-owner accounts, not super_admin system accounts
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

export default router;
