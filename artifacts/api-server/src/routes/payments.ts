import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/User";
import { StoreRequest } from "../models/StoreRequest";
import { Notification } from "../models/Notification";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";

const router = Router();

const REWARD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
function generateRewardCode(email: string): string {
  const prefix = email.split("@")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X");
  const random = Array.from({ length: 7 }, () => REWARD_CHARS[Math.floor(Math.random() * REWARD_CHARS.length)]).join("");
  return `${prefix}${random}`;
}

function parsePrice(str: string): number {
  const n = parseFloat(String(str).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function calcSubscriptionDates(period: string): { start: Date | null; end: Date | null } {
  if (!period) return { start: null, end: null };
  const p = period.toLowerCase();
  const now = new Date();
  if (p.includes("lifetime") || p.includes("life")) return { start: now, end: null };
  if (p.includes("day")) {
    const d = parseInt(p) || 30;
    const end = new Date(now); end.setDate(end.getDate() + d);
    return { start: now, end };
  }
  if (p.includes("month")) {
    const m = parseInt(p) || 1;
    const end = new Date(now); end.setMonth(end.getMonth() + m);
    return { start: now, end };
  }
  if (p.includes("year")) {
    const end = new Date(now); end.setDate(end.getDate() + 365);
    return { start: now, end };
  }
  return { start: null, end: null };
}

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return { key_id, key_secret };
}

// ── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a Razorpay order for the given plan price
router.post("/payments/create-order", async (req: any, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ error: "Payment gateway not configured. Please contact support." });
      return;
    }

    const { planPrice, planName, email } = req.body;
    const amountRupees = parsePrice(planPrice);
    if (!amountRupees || amountRupees <= 0) {
      res.status(400).json({ error: "Invalid plan price" });
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);

    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });

    const order = await instance.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `store_${Date.now()}`,
      notes: { planName: planName ?? "", email: email ?? "" },
    });

    res.json({ orderId: order.id, amount: amountPaise, currency: "INR", keyId: rzp.key_id });
  } catch (err) {
    req.log?.error({ err }, "Create Razorpay order error");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// ── POST /api/payments/verify-and-register ───────────────────────────────────
// Verifies Razorpay payment signature, then auto-creates admin account
router.post("/payments/verify-and-register", async (req: any, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ error: "Payment gateway not configured." });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email, password, storeName, whatsapp,
      plan, planName, planPrice, planPeriod, planBadge, planColor,
      couponCode, ref_admin,
    } = req.body;

    // 1. Verify Razorpay signature
    const expectedSig = crypto
      .createHmac("sha256", rzp.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      res.status(400).json({ error: "Payment verification failed. Please contact support." });
      return;
    }

    // 2. Check for duplicates
    const emailLower = (email ?? "").toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      res.status(400).json({ error: "Email already registered. Please login." });
      return;
    }

    const cleanPhone = (whatsapp ?? "").replace(/\D/g, "").replace(/^91/, "");

    // 3. Create StoreRequest (approved immediately)
    const rewardCode = generateRewardCode(emailLower);
    const request = await StoreRequest.create({
      email: emailLower,
      password,
      storeName,
      whatsapp: cleanPhone ? `+91${cleanPhone}` : whatsapp,
      plan: plan ?? planName ?? "",
      planName: planName ?? plan ?? "",
      planPrice: planPrice ?? "",
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
      status: "approved",
      submittedBy: "razorpay",
      referred_by_admin_username: (ref_admin ?? "").trim(),
      rewardCode,
    });

    // 4. Create User (admin account)
    const autoUsername = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { start, end } = calcSubscriptionDates(planPeriod ?? "");

    await User.create({
      username: autoUsername,
      email: emailLower,
      password,
      adminNumber: cleanPhone,
      role: "admin",
      planName: planName ?? plan ?? "",
      planPrice: planPrice ?? "",
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
      subscriptionStartDate: start,
      subscriptionEndDate: end,
      coupon_code: couponCode ? String(couponCode).toUpperCase() : "",
      signup_source: couponCode ? "INFLUENCER" : "ORGANIC",
    });

    // 5. Notification
    await Notification.create({
      type: "store_request",
      message: `Store "${storeName}" registered via Razorpay payment (${razorpay_payment_id})`,
      relatedId: String(request._id),
    });

    // 6. Track coupon — increment total_signups on influencer or ambassador
    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase();
      const infResult = await Influencer.updateOne({ coupon_code: code }, { $inc: { total_signups: 1 } });
      if (!infResult.modifiedCount) {
        await Ambassador.updateOne({ referral_code: code }, { $inc: { total_signups: 1 } });
      }
    }

    res.json({ success: true, email: emailLower, storeName });
  } catch (err) {
    req.log?.error({ err }, "Verify and register error");
    res.status(500).json({ error: "Registration failed. Please contact support." });
  }
});

export default router;
