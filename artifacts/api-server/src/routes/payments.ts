import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/User";
import { Notification } from "../models/Notification";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { DynamicPricing } from "../models/DynamicPricing";
import {
  sendStoreCreatedEmail,
  sendStoreReactivatedEmail,
  sendAutopayAutoCancelledEmail,
  sendOtpEmail,
} from "../services/emailOtp";
import { OtpCode } from "../models/OtpCode";
import { RevenuePayment } from "../models/RevenuePayment";
import { ConsumedPayment } from "../models/ConsumedPayment";
import { requireAuth, requireAuthForRenewal, AuthRequest } from "../middlewares/auth";

const router = Router();


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
    const end = new Date(now);
    const targetMonth = end.getMonth() + m;
    end.setMonth(targetMonth);
    // If day overflowed (e.g. Jan 31 + 1 month → March 3), clamp to last day of intended month
    if (end.getMonth() !== ((targetMonth) % 12)) {
      end.setDate(0); // last day of previous month = intended month's last day
    }
    return { start: now, end };
  }
  if (p.includes("year")) {
    const end = new Date(now); end.setFullYear(end.getFullYear() + 1);
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

/**
 * Cross-checks the amount actually paid on a Razorpay order against the plan price
 * the client is now claiming at verification time. Without this, a client could pay
 * for a cheap plan at /create-order and then claim a more expensive plan's
 * name/price/features at /verify-and-register or /renewal-verify — the signature
 * check alone only proves payment_id belongs to order_id, not that the claimed plan
 * matches what was actually charged.
 *
 * Also confirms order.status === "paid" so we don't act on a signature that matched
 * but whose underlying order was never actually collected.
 */
async function verifyOrderMatchesClaimedPrice(
  rzp: { key_id: string; key_secret: string },
  orderId: string,
  claimedPlanPriceRupees: number
): Promise<boolean> {
  try {
    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: rzp.key_id, key_secret: rzp.key_secret });
    const order = await (instance.orders.fetch as any)(orderId);
    // Confirm the order is in "paid" state — don't trust a signature alone
    if (order.status !== "paid") return false;
    const expectedPaise = Math.round((claimedPlanPriceRupees + claimedPlanPriceRupees * 0.02) * 100);
    // Allow a 1-paise tolerance for rounding
    return Math.abs(Number(order.amount) - expectedPaise) <= 1;
  } catch {
    return false;
  }
}

/**
 * Per-admin/per-email in-flight lock.
 *
 * Guarantees that only one payment request per user is processed at a time —
 * rapid double-clicks or parallel calls from the same user are rejected with 429
 * until the first call completes (success or error).
 *
 * Key is the admin's userId (for auth'd routes) or email (for pre-auth routes).
 * The lock is released in a finally block so crashes/errors never leave it stuck.
 *
 * NOTE: This is an in-process lock — sufficient for a single-process server.
 * If the server runs in multiple processes, replace with a short-TTL Redis lock.
 */
const paymentInflightKeys = new Set<string>();

function acquirePaymentLock(key: string): boolean {
  if (paymentInflightKeys.has(key)) return false;
  paymentInflightKeys.add(key);
  return true;
}

function releasePaymentLock(key: string): void {
  paymentInflightKeys.delete(key);
}

// ── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a Razorpay order for the given plan price
router.post("/payments/create-order", async (req: any, res) => {
  const emailLower = String(req.body?.email ?? "").toLowerCase().trim();
  const lockKey = `create-order:${emailLower}`;
  if (emailLower && !acquirePaymentLock(lockKey)) {
    res.status(429).json({ error: "A payment request is already in progress. Please wait for it to complete." });
    return;
  }
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
  } finally {
    if (emailLower) releasePaymentLock(lockKey);
  }
});

// ── POST /api/payments/verify-and-register ───────────────────────────────────
// Verifies Razorpay payment signature, then auto-creates admin account
router.post("/payments/verify-and-register", async (req: any, res) => {
  const _emailLower = String(req.body?.email ?? "").toLowerCase().trim();
  const _lockKey = `verify-register:${_emailLower}`;
  if (_emailLower && !acquirePaymentLock(_lockKey)) {
    res.status(429).json({ error: "A payment request is already in progress. Please wait for it to complete." });
    return;
  }
  // Hoisted so the outer catch can clean up on any unhandled error path.
  let consumedDoc: InstanceType<typeof ConsumedPayment> | null = null;
  // Set true only after User.create succeeds (the durable commit point for signup).
  // Once true, ConsumedPayment must NOT be deleted — the account exists; the payment
  // is consumed. Post-commit failures (notification, email) are non-fatal.
  let signupCommitted = false;
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

    // 1b. Confirm the plan/price being claimed here matches what was actually paid
    // for at /create-order — prevents paying for a cheap plan then registering as an
    // expensive one. Also confirms order.status === "paid".
    const claimedPriceRupees = parsePrice(planPrice);
    const amountMatches = await verifyOrderMatchesClaimedPrice(rzp, razorpay_order_id, claimedPriceRupees);
    if (!amountMatches) {
      req.log?.warn({ razorpay_order_id, planPrice }, "Plan price mismatch or order not paid at verify-and-register — rejected");
      res.status(400).json({ error: "Payment verification failed. Please contact support." });
      return;
    }

    // 1c. Atomic replay-protection — insert a ConsumedPayment record with a unique
    // index on razorpay_payment_id. If this payment_id was already processed (by any
    // instance), the DB rejects the insert with code 11000 and we bail out immediately.
    // We do this AFTER signature + order-status verification so we only consume
    // legitimate payment IDs (forged requests are rejected before reaching here).
    // consumedDoc is declared in the outer scope for catch-block cleanup.
    try {
      consumedDoc = await ConsumedPayment.create({
        razorpay_payment_id,
        razorpay_order_id,
        type: "signup",
        adminId: "",
      });
    } catch (idempErr: any) {
      if (idempErr?.code === 11000) {
        req.log?.warn({ razorpay_payment_id }, "Duplicate payment_id rejected at verify-and-register");
        res.status(400).json({ error: "Payment verification failed. Please contact support." });
        return;
      }
      throw idempErr; // unexpected — re-throw to outer catch
    }

    // 2. Check email OTP was verified (server-side proof)
    const emailLower = (email ?? "").toLowerCase().trim();
    const otpVerified = await OtpCode.findOne({
      email: emailLower,
      purpose: "signup",
      used: true,
      verified: true,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // within last 2 hours
    }).sort({ createdAt: -1 }).lean();
    if (!otpVerified) {
      // Release the idempotency record so the user can complete OTP verification and retry
      await ConsumedPayment.findByIdAndDelete(consumedDoc._id).catch(() => {});
      res.status(400).json({ error: "Email verification required. Please verify your email with OTP before completing payment." });
      return;
    }

    // 2b. Check for duplicates
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      // Payment already registered to this email — release so the user gets a clear error
      await ConsumedPayment.findByIdAndDelete(consumedDoc._id).catch(() => {});
      res.status(400).json({ error: "Email already registered. Please login." });
      return;
    }

    const cleanPhone = (whatsapp ?? "").replace(/\D/g, "").replace(/^91/, "");

    // 3. Create User (admin account)
    const autoUsername = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { start, end } = calcSubscriptionDates(planPeriod ?? "");

    const {
      originalPlanPrice: rawOriginalPrice,
    } = req.body;

    // Generate a short-lived token for the autopay setup step
    const setupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await User.create({
        username: autoUsername,
        email: emailLower,
        password,
        adminNumber: cleanPhone,
        role: "admin",
        planKey: plan ?? "",   // plan id from DynamicPricing — used for feature lookup in emails
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
    } catch (userCreateErr: any) {
      // If User creation fails, roll back idempotency record so the user can retry.
      if (consumedDoc?._id) {
        await ConsumedPayment.findByIdAndDelete(consumedDoc._id).catch(() => {});
      }
      req.log?.error({ err: userCreateErr }, "User.create failed — rolled back idempotency record");
      if (userCreateErr?.code === 11000) {
        res.status(400).json({ error: "Email already registered. Please login." });
      } else {
        res.status(500).json({ error: "Registration failed. Please contact support." });
      }
      return;
    }
    // Account durably created — from here on, ConsumedPayment must not be deleted.
    // Post-commit failures (revenue log, notification, email) are non-fatal.
    signupCommitted = true;

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

    // 6. Welcome email — fire-and-forget (non-blocking; failure must not break registration)
    (async () => {
      try {
        // Fetch plan features from DynamicPricing using the plan key (plan id)
        let planFeatures: string[] = [];
        const planKey = plan ?? planName ?? "";
        if (planKey) {
          const pricing = await DynamicPricing.findById("pricing-v2").lean();
          if (pricing) {
            const found = (pricing as any).plans?.find(
              (p: any) => String(p._id) === planKey || p.name === planKey
            );
            if (found?.features?.length) planFeatures = found.features;
          }
        }
        await sendStoreCreatedEmail({
          toEmail: emailLower,
          password,
          planName: planName ?? plan ?? "",
          planPrice: planPrice ?? "",
          planPeriod: planPeriod ?? "",
          planBadge: planBadge ?? "",
          storeName: storeName ?? "",
          planFeatures,
        });
      } catch (emailErr) {
        // Log but never throw — email failure is non-fatal
        console.error("[welcome-email] Failed to send store created email:", emailErr);
      }
    })();

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
    // Only release the idempotency record if the account was never durably created.
    // Once signupCommitted is true the User exists — deleting ConsumedPayment would
    // allow the same payment_id to be replayed and create a duplicate account.
    if (!signupCommitted && consumedDoc?._id) {
      await ConsumedPayment.findByIdAndDelete(consumedDoc._id).catch(() => {});
    }
    req.log?.error({ err, signupCommitted }, "Verify and register error");
    res.status(500).json({ error: "Registration failed. Please contact support." });
  } finally {
    if (_emailLower) releasePaymentLock(_lockKey);
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

    // Look up user by subscription ID — never trust email from client as proof of ownership
    const updateResult = await User.updateOne(
      { razorpaySubscriptionId: razorpay_subscription_id },
      { autopayStatus: "active" }
    );

    if (updateResult.matchedCount === 0) {
      res.status(404).json({ error: "No account found for this subscription." });
      return;
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
  const _userId = String((req as any).user?._id ?? "");
  const _lockKey = `renewal-create:${_userId}`;
  if (_userId && !acquirePaymentLock(_lockKey)) {
    res.status(429).json({ error: "A payment request is already in progress. Please wait for it to complete." });
    return;
  }
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
  } finally {
    if (_userId) releasePaymentLock(_lockKey);
  }
});

// ── POST /api/payments/renewal-verify ─────────────────────────────────────────
// Verifies Razorpay payment, updates admin plan + subscription, reactivates account
router.post("/payments/renewal-verify", requireAuthForRenewal, async (req: AuthRequest, res) => {
  const _userId = String((req as any).user?._id ?? "");
  const _lockKey = `renewal-verify:${_userId}`;
  if (_userId && !acquirePaymentLock(_lockKey)) {
    res.status(429).json({ error: "A payment request is already in progress. Please wait for it to complete." });
    return;
  }
  // Hoisted to outer scope so the catch block can release it on transient errors.
  // null means the idempotency record was never inserted (e.g. request failed
  // before reaching that point), so the catch never tries to clean it up.
  let renewalConsumedDoc: InstanceType<typeof ConsumedPayment> | null = null;
  // Set to true immediately after adminUser.save() succeeds. Once the renewal
  // is durably committed, we must NOT delete ConsumedPayment on later errors —
  // doing so would allow the same payment_id to be replayed on retry.
  let renewalCommitted = false;
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

    // Confirm the plan/price being claimed here matches what was actually paid for
    // at /renewal-create-order — prevents renewing at a cheap price then claiming an
    // expensive plan's name/features. Also confirms order.status === "paid".
    const claimedPriceRupees = parsePrice(planPrice);
    const amountMatches = await verifyOrderMatchesClaimedPrice(rzp, razorpay_order_id, claimedPriceRupees);
    if (!amountMatches) {
      req.log?.warn({ razorpay_order_id, planPrice }, "Plan price mismatch or order not paid at renewal-verify — rejected");
      res.status(400).json({ error: "Payment verification failed. Please contact support." }); return;
    }

    // ── Atomic replay-protection ──────────────────────────────────────────────
    // Insert a ConsumedPayment record with a unique index on razorpay_payment_id.
    // This atomically rejects any duplicate — including old payment IDs from prior
    // renewals — across all server instances.
    // Placed AFTER sig + order-status verification so forged requests never reach
    // the DB write. renewalConsumedDoc is declared in the outer scope so the catch
    // block can clean it up on transient failures.
    try {
      renewalConsumedDoc = await ConsumedPayment.create({
        razorpay_payment_id,
        razorpay_order_id,
        type: "renewal",
        adminId: String(user._id),
      });
    } catch (idempErr: any) {
      if (idempErr?.code === 11000) {
        req.log?.warn({ razorpay_payment_id }, "Duplicate payment_id rejected at renewal-verify");
        res.status(400).json({ error: "This payment has already been applied to your account." });
        return;
      }
      throw idempErr; // unexpected — re-throw to outer catch
    }

    const { start, end } = calcSubscriptionDates(planPeriod ?? "");

    const adminUser = await User.findById(String(user._id));
    if (!adminUser) {
      // User disappeared between auth and here — release idempotency record so retryable
      await ConsumedPayment.findByIdAndDelete(renewalConsumedDoc._id).catch(() => {});
      renewalConsumedDoc = null; // prevent double-delete in catch
      res.status(404).json({ error: "Admin not found" }); return;
    }

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
    adminUser.expiredEmailSent = false; // reset so next expiry cycle sends a fresh email
    // Audit trail — last renewal payment_id mirrored on the user document
    adminUser.lastVerifiedPaymentId = razorpay_payment_id;
    await adminUser.save();
    // Mark renewal as durably committed. From this point forward, ConsumedPayment
    // must NOT be deleted on error — the subscription is already extended, and
    // deleting it would allow the same payment_id to be replayed on retry.
    renewalCommitted = true;

    await RevenuePayment.create({
      adminId: String(adminUser._id),
      type: "renewal",
      amount: parsePrice(planPrice),
      planName: planName ?? adminUser.planName ?? "",
    });

    // Manual renewal email — fire-and-forget
    (async () => {
      try {
        let planFeatures: string[] = [];
        const pricing = await DynamicPricing.findById("pricing-v2").lean();
        if (pricing) {
          const found = (pricing as any).plans?.find(
            (p: any) => String(p._id) === (planKey ?? adminUser.planKey) || p.name === (planName ?? adminUser.planName)
          );
          if (found?.features?.length) planFeatures = found.features;
        }
        const { Store } = await import("../models/Store");
        const store = await Store.findOne({ ownerId: String(adminUser._id) }).lean();
        const storeName = (store as any)?.name ?? planName ?? adminUser.planName ?? "";
        await sendStoreReactivatedEmail({
          toEmail: adminUser.email,
          storeName,
          planName: planName ?? adminUser.planName ?? "",
          planPrice: planPrice ?? adminUser.planPrice ?? "",
          planPeriod: planPeriod ?? adminUser.planPeriod ?? "",
          planBadge: planBadge ?? adminUser.planBadge ?? "",
          planFeatures,
        });
      } catch (emailErr) {
        console.error("[manual-renewal-email] Failed:", emailErr);
      }
    })();

    res.json({ success: true });
  } catch (err: any) {
    // Only release the idempotency record if the renewal mutation has NOT yet
    // been committed (i.e. adminUser.save() never ran). Once renewalCommitted
    // is true the subscription is durably extended — deleting ConsumedPayment
    // would allow the same payment_id to be replayed, so we leave it in place.
    // Post-commit failures (revenue log, email) are non-fatal and do not warrant
    // a retry of the payment itself.
    if (!renewalCommitted && renewalConsumedDoc?._id) {
      await ConsumedPayment.findByIdAndDelete(renewalConsumedDoc._id).catch(() => {});
    }
    req.log?.error({ err, renewalCommitted }, "Renewal verify error");
    res.status(500).json({ error: "Renewal failed. Please contact support." });
  } finally {
    if (_userId) releasePaymentLock(_lockKey);
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
          isActive: true,
          expiredEmailSent: false,
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

      // Renewal email — fire-and-forget
      (async () => {
        try {
          let planFeatures: string[] = [];
          const pricing = await DynamicPricing.findById("pricing-v2").lean();
          if (pricing) {
            const found = (pricing as any).plans?.find(
              (p: any) => String(p._id) === user.planKey || p.name === user.planName
            );
            if (found?.features?.length) planFeatures = found.features;
          }
          const { Store } = await import("../models/Store");
          const store = await Store.findOne({ ownerId: String(user._id) }).lean();
          const storeName = (store as any)?.storeName ?? (store as any)?.name ?? user.planName ?? "";
          await sendStoreReactivatedEmail({
            toEmail: user.email,
            storeName,
            planName: user.planName ?? "",
            planPrice: user.planPrice ?? "",
            planPeriod: user.planPeriod ?? "",
            planBadge: user.planBadge ?? "",
            planFeatures,
          });
        } catch (emailErr) {
          console.error("[renewal-email] Failed to send store reactivated email:", emailErr);
        }
      })();
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
        // Notify the store owner that autopay was auto-cancelled
        try {
          const { Store } = await import("../models/Store");
          const store = await Store.findOne({ ownerId: String(user._id) }).lean();
          const storeName = (store as any)?.storeName ?? (store as any)?.name ?? user.planName ?? user.email;
          await sendAutopayAutoCancelledEmail({
            toEmail: user.email,
            storeName,
          });
        } catch (emailErr) {
          req.log?.error({ err: emailErr }, "Failed to send autopay auto-cancel email");
        }
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
