import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/User";
import { StoreRequest } from "../models/StoreRequest";
import { Notification } from "../models/Notification";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { OtpCode } from "../models/OtpCode";
import { RevenuePayment } from "../models/RevenuePayment";
import { sendOtpEmail } from "../services/emailOtp";
import { requireAuth, requireAuthForRenewal, AuthRequest } from "../middlewares/auth";

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
    const basePriceRupees = parsePrice(planPrice);
    if (!basePriceRupees || basePriceRupees <= 0) {
      res.status(400).json({ error: "Invalid plan price" });
      return;
    }

    // 2% payment gateway charge applied on top of the (possibly discounted) plan price
    const paymentCharge = Math.round(basePriceRupees * 0.02);
    const amountRupees = basePriceRupees + paymentCharge;
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
      couponCode, ref_admin, storeType,
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

    const {
      originalPlanPrice: rawOriginalPrice,
    } = req.body;

    // Generate a short-lived token for the autopay setup step
    const setupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
      storeType: storeType ?? "",
      originalPlanPrice: rawOriginalPrice ? String(rawOriginalPrice) : (planPrice ?? ""),
      autopayStatus: "none",
      autopaySetupToken: setupToken,
      autopaySetupTokenExpiry: setupTokenExpiry,
    });

    // 4b. Record revenue event — first-time signup payment
    const createdUser = await User.findOne({ email: emailLower }).select("_id");
    if (createdUser) {
      await RevenuePayment.create({
        adminId: String(createdUser._id),
        type: "signup",
        amount: parsePrice(planPrice),
        planName: planName ?? plan ?? "",
      });
    }

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

    res.json({ success: true, email: emailLower, storeName, autopaySetupToken: setupToken });
  } catch (err) {
    req.log?.error({ err }, "Verify and register error");
    res.status(500).json({ error: "Registration failed. Please contact support." });
  }
});

// ── Helpers for subscription period ─────────────────────────────────────────

/**
 * Parse day count from planPeriod strings — handles all formats:
 *   "/ 30 Days"  → 30    "/ 3 Months" → 90   "/ Year" → 365
 *   "/ 2 Years"  → 730   "30-day plan" → 30   "Monthly Plan" → 30
 */
function parsePeriodDays(period: string): number {
  const s = String(period).trim();

  // "/ X Days" or "X days" (case-insensitive)
  const daysM = s.match(/(\d+)\s*day/i);
  if (daysM) return parseInt(daysM[1]);

  // "/ X Months" or "X months"
  const monthsM = s.match(/(\d+)\s*month/i);
  if (monthsM) return parseInt(monthsM[1]) * 30;

  // "/ X Years" or "X years"
  const yearsM = s.match(/(\d+)\s*year/i);
  if (yearsM) return parseInt(yearsM[1]) * 365;

  // Bare "/ Year" or "Annual" (no count)
  if (/year|annual/i.test(s)) return 365;

  // Bare "/ Month" or "Monthly" (no count)
  if (/month/i.test(s)) return 30;

  return 30; // safe fallback
}

/** Map a day count to the nearest Razorpay billing period */
function daysToPeriod(days: number): { rzpPeriod: "monthly" | "yearly"; interval: number } {
  if (days >= 300) return { rzpPeriod: "yearly", interval: 1 };
  if (days >= 60) return { rzpPeriod: "monthly", interval: Math.max(1, Math.round(days / 30)) };
  return { rzpPeriod: "monthly", interval: 1 };
}

// ── POST /api/payments/create-subscription ───────────────────────────────────
// After first payment is verified: creates a Razorpay plan + subscription that
// starts billing at the NEXT renewal date (mandate-only flow today, no charge).
// Requires a short-lived autopaySetupToken issued by verify-and-register.
router.post("/payments/create-subscription", async (req: any, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ error: "Payment gateway not configured." });
      return;
    }

    const { email, autopaySetupToken } = req.body;
    if (!email || !autopaySetupToken) {
      res.status(400).json({ error: "Missing required fields." });
      return;
    }

    const emailLower = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    // ── Validate one-time setup token ─────────────────────────────────────
    if (
      !user.autopaySetupToken ||
      user.autopaySetupToken !== String(autopaySetupToken) ||
      !user.autopaySetupTokenExpiry ||
      new Date() > user.autopaySetupTokenExpiry
    ) {
      res.status(403).json({ error: "Invalid or expired autopay setup token." });
      return;
    }

    // ── Guard: only recurring plans have a renewal date ───────────────────
    if (!user.subscriptionEndDate) {
      res.status(400).json({ error: "This plan does not support autopay." });
      return;
    }

    // ── All plan data comes from the server-stored user record ─────────────
    const basePlanRupees = parsePrice(user.originalPlanPrice || user.planPrice);
    if (!basePlanRupees || basePlanRupees <= 0) {
      res.status(400).json({ error: "Could not determine plan price for autopay." });
      return;
    }

    // Every autopay renewal also collects a 2% payment gateway charge on top of the plan price
    const renewalPaymentCharge = Math.round(basePlanRupees * 0.02);
    const amountRupees = basePlanRupees + renewalPaymentCharge;

    const periodDays = parsePeriodDays(user.planPeriod);
    const { rzpPeriod, interval } = daysToPeriod(periodDays);
    const start_at = Math.floor(user.subscriptionEndDate.getTime() / 1000);

    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });

    // Create Razorpay Plan at original (non-discounted) price + 2% payment charges
    const plan = await (instance.plans.create as any)({
      period: rzpPeriod,
      interval,
      item: {
        name: user.planName || "Store Plan",
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        description: `${user.planName || "Store Plan"} — Web Media Hub AutoPay (incl. 2% payment charges)`,
      },
    });

    // Create subscription starting at next renewal (mandate only today — no charge)
    const totalCount = rzpPeriod === "yearly" ? 10 : 120;
    const subscription = await (instance.subscriptions.create as any)({
      plan_id: plan.id,
      total_count: totalCount,
      quantity: 1,
      start_at,
      customer_notify: 1,
      notes: { email: emailLower, planName: user.planName || "" },
    });

    // Consume token (one-time use) and store subscription details
    await User.updateOne(
      { email: emailLower },
      {
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: plan.id,
        autopayStatus: "pending",
        autopaySetupToken: "",
        autopaySetupTokenExpiry: null,
      }
    );

    res.json({
      subscriptionId: subscription.id,
      keyId: rzp.key_id,
      currency: "INR",
      nextBillingAt: user.subscriptionEndDate.toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "Create subscription error");
    res.status(500).json({ error: "Failed to create subscription." });
  }
});

// ── POST /api/payments/verify-subscription-auth ───────────────────────────────
// Verifies Razorpay mandate authentication after subscription checkout
router.post("/payments/verify-subscription-auth", async (req: any, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ error: "Payment gateway not configured." });
      return;
    }

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, email } = req.body;
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing Razorpay fields." });
      return;
    }

    const expectedSig = crypto
      .createHmac("sha256", rzp.key_secret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      res.status(400).json({ error: "Subscription authentication signature mismatch." });
      return;
    }

    if (email) {
      await User.updateOne(
        { email: String(email).toLowerCase().trim() },
        { autopayStatus: "active" }
      );
    }

    res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Verify subscription auth error");
    res.status(500).json({ error: "Failed to verify subscription authentication." });
  }
});

// ── POST /api/payments/renewal-create-order ──────────────────────────────────
// Creates Razorpay order for an existing admin renewing their plan
router.post("/payments/renewal-create-order", requireAuthForRenewal, async (req: AuthRequest, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) { res.status(503).json({ error: "Payment gateway not configured. Please contact support." }); return; }

    const user = req.user!;
    if (user.role !== "admin") { res.status(403).json({ error: "Only admins can renew a plan." }); return; }

    const { planPrice, planName } = req.body;
    const basePriceRupees = parsePrice(planPrice);
    if (!basePriceRupees || basePriceRupees <= 0) {
      res.status(400).json({ error: "Invalid plan price" }); return;
    }

    const paymentCharge = Math.round(basePriceRupees * 0.02);
    const amountRupees = basePriceRupees + paymentCharge;
    const amountPaise = Math.round(amountRupees * 100);

    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });
    const order = await (instance.orders.create as any)({
      amount: amountPaise,
      currency: "INR",
      receipt: `renewal_${Date.now()}`,
      notes: { planName: planName ?? "", email: user.email ?? "" },
    });

    res.json({ orderId: order.id, amount: amountPaise, currency: "INR", keyId: rzp.key_id });
  } catch (err) {
    req.log?.error({ err }, "Renewal create order error");
    res.status(500).json({ error: "Failed to create renewal order" });
  }
});

// ── POST /api/payments/renewal-verify ─────────────────────────────────────────
// Verifies Razorpay payment, updates admin plan + subscription, reactivates account
router.post("/payments/renewal-verify", requireAuthForRenewal, async (req: AuthRequest, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) { res.status(503).json({ error: "Payment gateway not configured." }); return; }

    const user = req.user!;
    if (user.role !== "admin") { res.status(403).json({ error: "Only admins can renew a plan." }); return; }

    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      planKey, planName, planPrice, planPeriod, planBadge, planColor,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing payment fields." }); return;
    }

    const expectedSig = crypto
      .createHmac("sha256", rzp.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      res.status(400).json({ error: "Payment verification failed. Please contact support." }); return;
    }

    const { start, end } = calcSubscriptionDates(planPeriod ?? "");

    const adminUser = await User.findById(String(user._id));
    if (!adminUser) { res.status(404).json({ error: "Admin not found" }); return; }

    if (planKey) adminUser.planKey = planKey;
    if (planName) adminUser.planName = planName;
    if (planPrice) {
      adminUser.planPrice = planPrice;
      adminUser.originalPlanPrice = planPrice;
    }
    if (planPeriod) adminUser.planPeriod = planPeriod;
    if (planBadge !== undefined) adminUser.planBadge = planBadge;
    if (planColor !== undefined) adminUser.planColor = planColor;
    adminUser.subscriptionStartDate = start;
    adminUser.subscriptionEndDate = end;
    adminUser.isActive = true;
    adminUser.activeSessions = [];
    await adminUser.save();

    await RevenuePayment.create({
      adminId: String(adminUser._id),
      type: "renewal",
      amount: parsePrice(planPrice),
      planName: planName ?? adminUser.planName ?? "",
    });

    res.json({ success: true });
  } catch (err) {
    req.log?.error({ err }, "Renewal verify error");
    res.status(500).json({ error: "Renewal failed. Please contact support." });
  }
});

// ── POST /api/payments/autopay/send-cancel-otp ────────────────────────────────
// Sends an OTP to the logged-in store owner's email to confirm AutoPay cancellation
router.post("/payments/autopay/send-cancel-otp", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.razorpaySubscriptionId || user.autopayStatus !== "active") {
      res.status(400).json({ error: "AutoPay is not currently active on this account." });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({
      email: user.email.toLowerCase().trim(),
      storeId: String(user._id),
      code,
      purpose: "cancel-autopay",
      expiresAt,
    });

    await sendOtpEmail(user.email, code, user.planName || "your store", "cancel-autopay");

    res.json({ success: true, email: user.email });
  } catch (err) {
    (req as any).log?.error({ err }, "Send cancel-autopay OTP error");
    res.status(500).json({ error: "Failed to send verification code." });
  }
});

// ── POST /api/payments/autopay/cancel ─────────────────────────────────────────
// Verifies the OTP and cancels the Razorpay AutoPay subscription
router.post("/payments/autopay/cancel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ error: "OTP is required." });
      return;
    }

    if (!user.razorpaySubscriptionId || user.autopayStatus !== "active") {
      res.status(400).json({ error: "AutoPay is not currently active on this account." });
      return;
    }

    const emailLower = user.email.toLowerCase().trim();
    const record = await OtpCode.findOne({
      email: emailLower,
      purpose: "cancel-autopay",
      used: false,
    }).sort({ createdAt: -1 });

    if (
      !record ||
      new Date() > record.expiresAt ||
      record.code.length !== String(otp).length ||
      !crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(String(otp)))
    ) {
      res.status(400).json({ error: "Invalid or expired OTP." });
      return;
    }

    record.used = true;
    await record.save();

    const rzp = getRazorpay();
    if (rzp) {
      try {
        const Razorpay = (await import("razorpay")).default;
        const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });
        // Cancel at cycle end so the customer keeps access until subscriptionEndDate
        await (instance.subscriptions.cancel as any)(user.razorpaySubscriptionId, true);
      } catch (cancelErr) {
        (req as any).log?.error({ err: cancelErr }, "Failed to cancel Razorpay subscription");
        res.status(502).json({ error: "Failed to cancel AutoPay with payment gateway. Please try again." });
        return;
      }
    }

    await User.updateOne({ _id: user._id }, { autopayStatus: "cancelled" });

    res.json({ success: true });
  } catch (err) {
    (req as any).log?.error({ err }, "Cancel autopay error");
    res.status(500).json({ error: "Failed to cancel AutoPay." });
  }
});

// ── POST /api/payments/autopay/send-reactivate-otp ───────────────────────────
// Sends an OTP to confirm the admin wants to reactivate a previously cancelled AutoPay
router.post("/payments/autopay/send-reactivate-otp", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.autopayStatus !== "cancelled") {
      res.status(400).json({ error: "AutoPay is not in cancelled state." });
      return;
    }
    if (!user.subscriptionEndDate) {
      res.status(400).json({ error: "This plan does not support AutoPay." });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({
      email: user.email.toLowerCase().trim(),
      storeId: String(user._id),
      code,
      purpose: "reactivate-autopay",
      expiresAt,
    });

    await sendOtpEmail(user.email, code, user.planName || "your store", "reactivate-autopay");

    res.json({ success: true, email: user.email });
  } catch (err) {
    (req as any).log?.error({ err }, "Send reactivate-autopay OTP error");
    res.status(500).json({ error: "Failed to send verification code." });
  }
});

// ── POST /api/payments/autopay/reactivate ─────────────────────────────────────
// Verifies the OTP, then creates a fresh Razorpay subscription for the current plan
// starting from today's subscriptionEndDate. Returns subscriptionId + keyId so the
// frontend can open the Razorpay checkout for mandate authentication.
router.post("/payments/autopay/reactivate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { otp } = req.body;
    if (!otp) {
      res.status(400).json({ error: "OTP is required." });
      return;
    }
    if (user.autopayStatus !== "cancelled") {
      res.status(400).json({ error: "AutoPay is not in cancelled state." });
      return;
    }
    if (!user.subscriptionEndDate) {
      res.status(400).json({ error: "This plan does not support AutoPay." });
      return;
    }

    const emailLower = user.email.toLowerCase().trim();
    const record = await OtpCode.findOne({
      email: emailLower,
      purpose: "reactivate-autopay",
      used: false,
    }).sort({ createdAt: -1 });

    if (
      !record ||
      new Date() > record.expiresAt ||
      record.code.length !== String(otp).length ||
      !crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(String(otp)))
    ) {
      res.status(400).json({ error: "Invalid or expired OTP." });
      return;
    }

    record.used = true;
    await record.save();

    const rzp = getRazorpay();
    if (!rzp) {
      res.status(503).json({ error: "Payment gateway not configured." });
      return;
    }

    const basePlanRupees = parsePrice(user.originalPlanPrice || user.planPrice);
    if (!basePlanRupees || basePlanRupees <= 0) {
      res.status(400).json({ error: "Could not determine plan price for AutoPay." });
      return;
    }

    const renewalPaymentCharge = Math.round(basePlanRupees * 0.02);
    const amountRupees = basePlanRupees + renewalPaymentCharge;
    const periodDays = parsePeriodDays(user.planPeriod);
    const { rzpPeriod, interval } = daysToPeriod(periodDays);

    // New subscription starts billing from the current subscriptionEndDate
    const start_at = Math.floor(user.subscriptionEndDate.getTime() / 1000);

    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });

    const plan = await (instance.plans.create as any)({
      period: rzpPeriod,
      interval,
      item: {
        name: user.planName || "Store Plan",
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        description: `${user.planName || "Store Plan"} — Web Media Hub AutoPay (incl. 2% payment charges)`,
      },
    });

    const totalCount = rzpPeriod === "yearly" ? 10 : 120;
    const subscription = await (instance.subscriptions.create as any)({
      plan_id: plan.id,
      total_count: totalCount,
      quantity: 1,
      start_at,
      customer_notify: 1,
      notes: { email: emailLower, planName: user.planName || "" },
    });

    await User.updateOne(
      { _id: user._id },
      {
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: plan.id,
        autopayStatus: "pending",
      }
    );

    res.json({
      subscriptionId: subscription.id,
      keyId: rzp.key_id,
      currency: "INR",
      nextBillingAt: user.subscriptionEndDate.toISOString(),
    });
  } catch (err) {
    (req as any).log?.error({ err }, "Reactivate autopay error");
    res.status(500).json({ error: "Failed to reactivate AutoPay." });
  }
});

// ── POST /api/payments/razorpay-webhook ──────────────────────────────────────
// Handles Razorpay subscription lifecycle events (charged, cancelled, halted).
// Uses raw body (set up in app.ts) for HMAC verification.
router.post("/payments/razorpay-webhook", async (req: any, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Fail-closed: reject all webhook calls if secret is not configured in production
    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        req.log?.error("RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook in production");
        res.status(403).json({ error: "Webhook secret not configured." });
        return;
      }
      req.log?.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping signature check (dev mode only)");
    }

    // req.body is a Buffer (set by express.raw() in app.ts before JSON middleware)
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);

    if (webhookSecret) {
      const signature = req.headers["x-razorpay-signature"] as string;
      if (!signature) {
        res.status(400).json({ error: "Missing webhook signature." });
        return;
      }
      const expectedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");
      if (signature !== expectedSig) {
        res.status(400).json({ error: "Invalid webhook signature." });
        return;
      }
    }

    const body = JSON.parse(rawBody) as any;
    const { event, payload } = body ?? {};
    // subscription.* events nest the id under payload.subscription.entity.id;
    // payment.failed events (for subscription charges) carry it on payload.payment.entity.subscription_id
    const subscriptionId: string | undefined =
      payload?.subscription?.entity?.id || payload?.payment?.entity?.subscription_id;
    const paymentId: string | undefined = payload?.payment?.entity?.id;

    if (!event || !subscriptionId) {
      res.json({ ok: true });
      return;
    }

    if (event === "subscription.charged") {
      const user = await User.findOne({ razorpaySubscriptionId: subscriptionId });
      if (!user?.subscriptionEndDate) {
        res.json({ ok: true });
        return;
      }

      // Idempotency: skip if we already processed this payment event
      if (paymentId && user.lastWebhookPaymentId === paymentId) {
        req.log?.info({ paymentId }, "Webhook already processed — skipping duplicate");
        res.json({ ok: true });
        return;
      }

      // Extend subscription by exactly the plan's period (computed from stored planPeriod)
      const days = parsePeriodDays(user.planPeriod);
      const newEnd = new Date(user.subscriptionEndDate.getTime() + days * 24 * 60 * 60 * 1000);

      await User.updateOne(
        { razorpaySubscriptionId: subscriptionId },
        {
          subscriptionEndDate: newEnd,
          autopayStatus: "active",
          lastWebhookPaymentId: paymentId ?? "",
          // Successful charge resets the consecutive-failure counter
          failedPaymentCount: 0,
        }
      );

      // Record revenue event — autopay renewal charge
      await RevenuePayment.create({
        adminId: String(user._id),
        type: "renewal",
        amount: parsePrice(user.originalPlanPrice || user.planPrice),
        planName: user.planName || "",
      });
    } else if (event === "payment.failed") {
      const user = await User.findOne({ razorpaySubscriptionId: subscriptionId });
      if (!user) {
        res.json({ ok: true });
        return;
      }

      const newFailedCount = (user.failedPaymentCount || 0) + 1;
      req.log?.warn(
        { subscriptionId, paymentId, failedPaymentCount: newFailedCount },
        "Autopay payment failed"
      );

      if (newFailedCount >= 2) {
        // 2 consecutive failures — stop autopay so no further charges are attempted.
        const rzp = getRazorpay();
        if (rzp) {
          try {
            const Razorpay = (await import("razorpay")).default;
            const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });
            await (instance.subscriptions.cancel as any)(subscriptionId, false);
          } catch (cancelErr) {
            req.log?.error({ err: cancelErr, subscriptionId }, "Failed to cancel Razorpay subscription after repeated failures");
          }
        }
        await User.updateOne(
          { razorpaySubscriptionId: subscriptionId },
          { autopayStatus: "cancelled", failedPaymentCount: newFailedCount }
        );
      } else {
        await User.updateOne(
          { razorpaySubscriptionId: subscriptionId },
          { failedPaymentCount: newFailedCount }
        );
      }
    } else if (event === "subscription.authenticated") {
      await User.updateOne({ razorpaySubscriptionId: subscriptionId }, { autopayStatus: "active" });
    } else if (event === "subscription.cancelled" || event === "subscription.halted") {
      await User.updateOne({ razorpaySubscriptionId: subscriptionId }, { autopayStatus: "cancelled" });
    } else if (event === "subscription.pending" || event === "subscription.resumed") {
      await User.updateOne({ razorpaySubscriptionId: subscriptionId }, { autopayStatus: "pending" });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log?.error({ err }, "Razorpay webhook error");
    res.status(500).json({ error: "Webhook processing failed." });
  }
});

export default router;
