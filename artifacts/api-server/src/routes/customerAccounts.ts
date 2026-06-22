import { Router } from "express";
import bcrypt from "bcryptjs";
import { CustomerAccount } from "../models/CustomerAccount";
import { OtpCode } from "../models/OtpCode";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { sendOtpEmail } from "../services/emailOtp";

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
router.post("/public/customer-account/send-otp", async (req, res) => {
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
        res.status(409).json({ error: "This number already has an account. Please sign in instead.", code: "already_exists" });
        return;
      }
    } else if (purpose === "signin") {
      const account = await CustomerAccount.findOne({ storeId, mobileNumber });
      if (!account) {
        res.status(404).json({ error: "No account found with this number", code: "not_found" });
        return;
      }
      const passwordMatch = await bcrypt.compare(password, account.password);
      if (!passwordMatch) {
        res.status(401).json({ error: "Wrong password", code: "wrong_password" });
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
    console.error("OTP send error:", err?.message);
    res.status(500).json({ error: "Failed to send OTP. Please check your email address." });
  }
});

/* ── VERIFY OTP + SIGNUP ── */
router.post("/public/customer-account/verify-signup", async (req, res) => {
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
      code: otp,
      purpose: "signup",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      res.status(400).json({ error: "Invalid or expired OTP. Please try again.", code: "invalid_otp" });
      return;
    }

    const existing = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (existing) {
      res.status(409).json({ error: "Account already exists. Please sign in.", code: "already_exists" });
      return;
    }

    otpDoc.used = true;
    await otpDoc.save();

    const account = await CustomerAccount.create({ storeId, mobileNumber, password });

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
router.post("/public/customer-account/verify-signin", async (req, res) => {
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
      code: otp,
      purpose: "signin",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      res.status(400).json({ error: "Invalid or expired OTP. Please try again.", code: "invalid_otp" });
      return;
    }

    const account = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (!account) {
      res.status(401).json({ error: "Account verification failed", code: "wrong_password" });
      return;
    }
    const passwordMatch = await bcrypt.compare(password, account.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Account verification failed", code: "wrong_password" });
      return;
    }

    otpDoc.used = true;
    await otpDoc.save();

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
