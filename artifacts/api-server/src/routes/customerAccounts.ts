import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { CustomerAccount } from "../models/CustomerAccount";
import { MarketingCampaign } from "../models/MarketingCampaign";
import { OtpCode } from "../models/OtpCode";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { sendOtpEmail } from "../services/emailOtp";
import { validate } from "../middlewares/validate";
import {
  CustomerSendOtpSchema,
  CustomerVerifySignupSchema,
  CustomerVerifySigninSchema,
} from "../schemas/authSchemas";

const router = Router();

function isValidMobile(mobile: string): boolean {
  if (!/^\d{10}$/.test(mobile)) return false;
  if (/^(\d)\1{9}$/.test(mobile)) return false;
  const spam = ["1234567890", "0123456789", "9876543210", "1111111111", "0000000000"];
  return !spam.includes(mobile);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ── SEND OTP ── */
router.post("/public/customer-account/send-otp", validate(CustomerSendOtpSchema), async (req, res) => {
  try {
    const { storeSlug, email, mobileNumber, password, purpose } = req.body;

    if (!storeSlug || !email || !mobileNumber || !password || !purpose) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    if (!isValidMobile(mobileNumber)) {
      res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
      return;
    }

    if (!/^\d{10}$/.test(password)) {
      res.status(400).json({ error: "Password must be exactly 10 digits" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    if (purpose === "signup") {
      const existing = await CustomerAccount.findOne({ storeId, mobileNumber });
      if (existing) {
        res.status(409).json({ error: "Unable to process request. Please try again.", code: "already_exists" });
        return;
      }
    } else if (purpose === "signin") {
      const account = await CustomerAccount.findOne({ storeId, mobileNumber });
      if (!account) {
        res.status(401).json({ error: "Incorrect email or password.", code: "not_found" });
        return;
      }
      const passwordMatch = await account.comparePassword(password);
      if (!passwordMatch) {
        res.status(401).json({ error: "Incorrect email or password.", code: "wrong_password" });
        return;
      }
    }

    // Rate limit: max 3 OTPs per email per 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await OtpCode.countDocuments({ email, storeId, createdAt: { $gt: tenMinAgo } });
    if (recentCount >= 3) {
      res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes and try again." });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({ email, storeId, code: otp, purpose, expiresAt });

    await sendOtpEmail(email, otp, store.name ?? "Store", purpose as "signup" | "signin");

    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (err: any) {
    req.log?.error({ err }, "OTP send error");
    res.status(500).json({ error: "Failed to send OTP. Please check your email address." });
  }
});

/* ── VERIFY OTP + SIGNUP ── */
router.post("/public/customer-account/verify-signup", validate(CustomerVerifySignupSchema), async (req, res) => {
  try {
    const { storeSlug, email, mobileNumber, password, otp } = req.body;

    if (!storeSlug || !email || !mobileNumber || !password || !otp) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    const otpDoc = await OtpCode.findOne({
      email,
      storeId,
      purpose: "signup",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    const otpValid = otpDoc &&
      otpDoc.code.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(otpDoc.code), Buffer.from(otp));

    if (!otpValid) {
      res.status(400).json({ error: "Invalid or expired OTP. Please try again.", code: "invalid_otp" });
      return;
    }

    const existing = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (existing) {
      res.status(409).json({ error: "Unable to complete registration. Please try again.", code: "already_exists" });
      return;
    }

    otpDoc.used = true;
    await otpDoc.save();

    const source = typeof req.body.source === "string" ? req.body.source.slice(0, 50) : undefined;
    const campaign = typeof req.body.campaign === "string" ? req.body.campaign.slice(0, 100) : undefined;

    const account = await CustomerAccount.create({ storeId, mobileNumber, password, source, campaign });

    // Increment trackedCount (account opens) on the matching campaign.
    // Don't filter by isActive — attribution should be counted even if the campaign was later deactivated.
    if (source && campaign) {
      MarketingCampaign.findOneAndUpdate(
        { storeId, source, campaignSlug: campaign },
        { $inc: { trackedCount: 1 } }
      ).catch((err) => {
        req.log?.error({ err, source, campaign, storeId }, "Failed to increment campaign trackedCount");
      });
    }

    res.status(201).json({
      id: String(account._id),
      mobileNumber: account.mobileNumber,
      createdAt: account.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── VERIFY OTP + SIGNIN ── */
router.post("/public/customer-account/verify-signin", validate(CustomerVerifySigninSchema), async (req, res) => {
  try {
    const { storeSlug, email, mobileNumber, password, otp } = req.body;

    if (!storeSlug || !email || !mobileNumber || !password || !otp) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    const otpDoc = await OtpCode.findOne({
      email,
      storeId,
      purpose: "signin",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    const otpValid = otpDoc &&
      otpDoc.code.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(otpDoc.code), Buffer.from(otp));

    if (!otpValid) {
      res.status(400).json({ error: "Invalid or expired OTP. Please try again.", code: "invalid_otp" });
      return;
    }

    const account = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (!account) {
      res.status(401).json({ error: "Account verification failed", code: "wrong_password" });
      return;
    }
    const passwordMatch = await account.comparePassword(password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Account verification failed", code: "wrong_password" });
      return;
    }

    // Lazy cost-factor upgrade — fire-and-forget
    if (account.needsRehash()) {
      bcrypt.hash(password, 12)
        .then((newHash) => CustomerAccount.updateOne({ _id: account._id }, { $set: { password: newHash } }))
        .catch(() => {});
    }

    otpDoc.used = true;
    await otpDoc.save();

    // Update last activity timestamp on successful signin
    CustomerAccount.updateOne({ _id: account._id }, { $set: { lastActivityAt: new Date() } }).catch(() => {});

    res.json({
      id: String(account._id),
      mobileNumber: account.mobileNumber,
      createdAt: account.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── ADMIN: LIST ACCOUNTS ── */
router.get("/customer-accounts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      res.json([]);
      return;
    }

    const storeId = String(store._id);
    const accounts = await CustomerAccount.find({ storeId }).sort({ createdAt: -1 });

    res.json(accounts.map(a => ({
      id: String(a._id),
      mobileNumber: a.mobileNumber,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
