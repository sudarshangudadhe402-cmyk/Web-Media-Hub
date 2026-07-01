import { Router } from "express";
import crypto from "crypto";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { requireSuperAdmin } from "../middlewares/auth";
import { OtpCode } from "../models/OtpCode";
import { sendOtpEmail } from "../services/emailOtp";
import { PricingSettings } from "../models/PricingSettings";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { ReferralCode } from "../models/ReferralCode";
import { DEFAULT_PRICING_CONFIG } from "./settings";

const router = Router();

function calcSubscriptionDates(
  subscriptionDays: number | null | undefined,
  planPeriod: string
): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (subscriptionDays !== null && subscriptionDays !== undefined && subscriptionDays > 0) {
    const end = new Date(now);
    end.setDate(end.getDate() + subscriptionDays);
    return { start: now, end };
  }
  const p = (planPeriod ?? "").toLowerCase();
  if (p.includes("month")) {
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return { start: now, end };
  }
  if (p.includes("year")) {
    const end = new Date(now);
    end.setDate(end.getDate() + 365);
    return { start: now, end };
  }
  return { start: null, end: null };
}

async function getPricingPlans() {
  try {
    const s = await PricingSettings.findById("pricing");
    return (s?.plans ?? DEFAULT_PRICING_CONFIG) as typeof DEFAULT_PRICING_CONFIG;
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}

async function incrementCouponUsed(planKey: string, couponCode: string) {
  try {
    const settings = await PricingSettings.findById("pricing");
    if (!settings?.plans) return;
    const plan = (settings.plans as any)[planKey];
    const coupons: any[] = Array.isArray(plan?.coupons) ? plan.coupons : [];
    const idx = coupons.findIndex(
      (c: any) => c.code.toUpperCase() === couponCode.toUpperCase()
    );
    if (idx === -1) return;
    await PricingSettings.updateOne(
      { _id: "pricing" },
      { $inc: { [`plans.${planKey}.coupons.${idx}.usedCount`]: 1 } }
    );
  } catch {
    // Non-critical
  }
}

// ── Partner code helpers ──────────────────────────────────────────────────────
function parsePlanPrice(priceStr: any): number {
  if (!priceStr) return 0;
  const cleaned = String(priceStr).replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function applyDiscount(priceStr: string, discountPct: number): string {
  if (!discountPct) return priceStr;
  const numeric = parsePlanPrice(priceStr);
  if (!numeric) return priceStr;
  const discounted = Math.round(numeric * (1 - discountPct / 100));
  return `₹${discounted.toLocaleString("en-IN")}`;
}

interface PartnerInfo {
  type: "INFLUENCER" | "AMBASSADOR" | "REFERRAL";
  discount_percentage: number;
}

async function lookupPartnerCode(code: string): Promise<PartnerInfo | null> {
  const upper = code.toUpperCase();
  const inf = await Influencer.findOne({ coupon_code: upper }).select("customer_discount_percentage").lean();
  if (inf) return { type: "INFLUENCER", discount_percentage: (inf as any).customer_discount_percentage ?? 0 };

  const amb = await Ambassador.findOne({ referral_code: upper }).select("customer_discount_percentage").lean();
  if (amb) return { type: "AMBASSADOR", discount_percentage: (amb as any).customer_discount_percentage ?? 0 };

  const rc = await ReferralCode.findOne({ referral_code: upper }).select("customer_discount_percentage").lean();
  if (rc) return { type: "REFERRAL", discount_percentage: (rc as any).customer_discount_percentage ?? 0 };

  return null;
}

async function trackPartnerSignup(code: string, type: string, planPrice: string) {
  const upper = code.toUpperCase();
  const amount = parsePlanPrice(planPrice);
  const isPaid = amount > 0;
  const inc = { $inc: { total_signups: 1, ...(isPaid ? { total_paid_admins: 1, total_revenue: amount } : {}) } };

  if (type === "INFLUENCER") await Influencer.findOneAndUpdate({ coupon_code: upper }, inc);
  else if (type === "AMBASSADOR") await Ambassador.findOneAndUpdate({ referral_code: upper }, inc);
  else if (type === "REFERRAL") await ReferralCode.findOneAndUpdate({ referral_code: upper }, inc);
}

// ── Send OTP to verify admin email before creation ──────────────────────────
router.post("/admins/send-creation-otp", requireSuperAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: "Please enter a valid email address" }); return;
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase(), role: "admin" });
    if (existing) {
      res.status(400).json({ error: "Unable to complete request. Please try again." }); return;
    }

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await OtpCode.countDocuments({
      email: email.trim().toLowerCase(),
      purpose: "admin-creation",
      createdAt: { $gte: tenMinAgo },
    });
    if (recentCount >= 3) {
      res.status(429).json({ error: "Too many OTP requests. Please wait 10 minutes." }); return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.create({ email: email.trim().toLowerCase(), storeId: "admin", code, purpose: "admin-creation", expiresAt });
    await sendOtpEmail(email.trim(), code, "Web Media Hub", "admin-creation");

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    req.log.error({ err }, "Send admin creation OTP error");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ── Verify OTP for admin email ────────────────────────────────────────────────
router.post("/admins/verify-creation-otp", requireSuperAdmin, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) { res.status(400).json({ error: "Email and OTP are required" }); return; }

    const record = await OtpCode.findOne({
      email: email.trim().toLowerCase(),
      purpose: "admin-creation",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) { res.status(400).json({ error: "Invalid or expired code. Please request a new one." }); return; }
    const otpMatch = crypto.timingSafeEqual(Buffer.from(record.code), Buffer.from(otp.trim().padEnd(record.code.length)));
    if (!otpMatch || record.code.length !== otp.trim().length) {
      res.status(400).json({ error: "Incorrect OTP. Please try again." }); return;
    }

    record.used = true;
    await record.save();

    res.json({ verified: true });
  } catch (err) {
    req.log.error({ err }, "Verify admin creation OTP error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Source breakdown: how many admins came from each signup_source ────────────
router.get("/admins/source-breakdown", requireSuperAdmin, async (req, res) => {
  try {
    const breakdown = await User.aggregate([
      { $match: { role: "admin" } },
      {
        $group: {
          _id: { $ifNull: [{ $trim: { input: "$signup_source" } }, "ORGANIC"] },
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $ne: ["$isActive", true] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = breakdown.reduce((s: number, r: any) => s + r.count, 0);

    res.json({
      total,
      breakdown: breakdown.map((r: any) => ({
        source: r._id || "ORGANIC",
        count: r.count,
        active: r.active,
        inactive: r.inactive,
        percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Source breakdown error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── All-admins stats overview ─────────────────────────────────────────────────
router.get("/admins/stats-overview", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id username email adminNumber planName planBadge planColor").lean();
    const adminIds = admins.map((a: any) => String(a._id));

    const stores = await Store.find({ ownerId: { $in: adminIds } }).select("_id ownerId name").lean();
    const storeIdToOwnerId: Record<string, string> = {};
    const ownerIdToStoreName: Record<string, string> = {};
    for (const s of stores) {
      storeIdToOwnerId[String(s._id)] = String((s as any).ownerId);
      ownerIdToStoreName[String((s as any).ownerId)] = (s as any).name ?? "";
    }

    const tryOnAgg = await Product.aggregate([
      { $match: { storeId: { $in: Object.keys(storeIdToOwnerId) } } },
      { $group: { _id: "$storeId", tryOnCount: { $sum: "$tryOnLikeCount" } } },
    ]);

    const ownerTryOn: Record<string, number> = {};
    let totalTryOn = 0;
    for (const row of tryOnAgg) {
      const ownerId = storeIdToOwnerId[row._id];
      if (ownerId) {
        ownerTryOn[ownerId] = (ownerTryOn[ownerId] ?? 0) + row.tryOnCount;
        totalTryOn += row.tryOnCount;
      }
    }

    const adminStats = admins
      .map((a: any) => ({
        id: String(a._id),
        username: a.username,
        email: a.email ?? "",
        adminNumber: a.adminNumber ?? "",
        planName: a.planName ?? "",
        planBadge: a.planBadge ?? "",
        planColor: a.planColor ?? "",
        storeName: ownerIdToStoreName[String(a._id)] ?? "",
        tryOnCount: ownerTryOn[String(a._id)] ?? 0,
        adsCount: 0,
      }))
      .sort((x: any, y: any) => y.tryOnCount - x.tryOnCount);

    res.json({ totalTryOn, totalAds: 0, admins: adminStats });
  } catch (err) {
    req.log.error({ err }, "Stats overview error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 });

    const adminIds = admins.map((a) => String(a._id));
    const stores = await Store.find({ ownerId: { $in: adminIds } }).select("ownerId publicSlug name createdAt");

    const storeMap: Record<string, { publicSlug: string; name: string; createdAt: Date | null }> = {};
    for (const s of stores) {
      if (s.ownerId) storeMap[s.ownerId] = { publicSlug: s.publicSlug, name: s.name, createdAt: (s as any).createdAt ?? null };
    }

    res.json(
      admins.map((a) => ({
        id: String(a._id),
        username: a.username,
        email: a.email ?? "",
        adminNumber: a.adminNumber ?? "",
        role: a.role,
        isActive: a.isActive !== false,
        activeSessionCount: (a.activeSessions ?? []).length,
        storeSlug: storeMap[String(a._id)]?.publicSlug ?? null,
        storeName: storeMap[String(a._id)]?.name ?? null,
        storeCreatedAt: storeMap[String(a._id)]?.createdAt?.toISOString() ?? null,
        planKey: a.planKey ?? "",
        planName: a.planName ?? "",
        planPrice: a.planPrice ?? "",
        planPeriod: a.planPeriod ?? "",
        planBadge: a.planBadge ?? "",
        planColor: a.planColor ?? "",
        subscriptionStartDate: a.subscriptionStartDate ? a.subscriptionStartDate.toISOString() : null,
        subscriptionEndDate: a.subscriptionEndDate ? a.subscriptionEndDate.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List admins error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const {
      email, password, adminNumber,
      planKey, planName, planPeriod, planBadge, planColor,
      couponCode, partnerCode,
    } = req.body;
    let planPrice: string = req.body.planPrice ?? "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }

    const existingEmail = await User.findOne({ email: email.trim(), role: "admin" });
    if (existingEmail) {
      res.status(400).json({ error: "An admin account with this email already exists." });
      return;
    }

    if (adminNumber && adminNumber.trim()) {
      const existingMobile = await User.findOne({ adminNumber: adminNumber.trim(), role: "admin" });
      if (existingMobile) {
        res.status(400).json({ error: "An admin account with this mobile number already exists." });
        return;
      }
    }

    const pricingPlans = await getPricingPlans();
    const planCfg = planKey ? (pricingPlans as any)[planKey] : null;
    const subscriptionDays: number | null = planCfg?.subscriptionDays ?? null;

    // ── Partner code: look up, apply discount, set signup source ──────────────
    let signupSource = "ORGANIC";
    let storedCouponCode = "";
    let partnerType = "";

    if (partnerCode && partnerCode.trim()) {
      const partner = await lookupPartnerCode(partnerCode.trim());
      if (partner) {
        partnerType = partner.type;
        signupSource = partner.type;
        storedCouponCode = partnerCode.trim().toUpperCase();
        if (partner.discount_percentage > 0 && planPrice) {
          planPrice = applyDiscount(planPrice, partner.discount_percentage);
        }
      }
    }

    const autoUsername = `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const { start, end } = calcSubscriptionDates(subscriptionDays, planPeriod ?? "");

    const admin = await User.create({
      username: autoUsername,
      email: email.trim(),
      password,
      adminNumber: adminNumber ?? "",
      role: "admin",
      isActive: true,
      planKey: planKey ?? "",
      planName: planName ?? "",
      planPrice,
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
      subscriptionStartDate: start,
      subscriptionEndDate: end,
      signup_source: signupSource,
      coupon_code: storedCouponCode,
    });

    // Increment pricing coupon usage (non-partner coupons)
    if (couponCode && planKey && !partnerType) {
      await incrementCouponUsed(planKey, couponCode);
    }

    // Track partner signup stats
    if (partnerType && storedCouponCode) {
      try { await trackPartnerSignup(storedCouponCode, partnerType, planPrice); } catch { /* non-critical */ }
    }

    res.status(201).json({
      id: String(admin._id),
      username: admin.username,
      email: admin.email ?? "",
      adminNumber: admin.adminNumber ?? "",
      role: admin.role,
      isActive: true,
      activeSessionCount: 0,
      storeSlug: null,
      storeName: null,
      storeCreatedAt: null,
      planKey: admin.planKey ?? "",
      planName: admin.planName ?? "",
      planPrice: admin.planPrice ?? "",
      planPeriod: admin.planPeriod ?? "",
      planBadge: admin.planBadge ?? "",
      planColor: admin.planColor ?? "",
      subscriptionStartDate: admin.subscriptionStartDate ? admin.subscriptionStartDate.toISOString() : null,
      subscriptionEndDate: admin.subscriptionEndDate ? admin.subscriptionEndDate.toISOString() : null,
      createdAt: admin.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admins/:id/renew-subscription", requireSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    const pricingPlans = await getPricingPlans();
    const planKey = admin.planKey || "";
    const planCfg = planKey ? (pricingPlans as any)[planKey] : null;
    const subscriptionDays: number | null = planCfg?.subscriptionDays ?? null;

    const { start, end } = calcSubscriptionDates(subscriptionDays, admin.planPeriod ?? "");
    if (!end) { res.status(400).json({ error: "This plan does not have a subscription period" }); return; }

    admin.subscriptionStartDate = start;
    admin.subscriptionEndDate = end;
    admin.isActive = true;
    await admin.save();
    res.json({
      id: String(admin._id),
      subscriptionStartDate: admin.subscriptionStartDate?.toISOString() ?? null,
      subscriptionEndDate: admin.subscriptionEndDate?.toISOString() ?? null,
      isActive: admin.isActive,
    });
  } catch (err) {
    req.log.error({ err }, "Renew subscription error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admins/:id/toggle-active", requireSuperAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") { res.status(400).json({ error: "isActive must be a boolean" }); return; }
    const updateFields: Record<string, unknown> = { isActive };
    if (!isActive) updateFields.activeSessions = [];
    const admin = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }
    res.json({ id: String(admin._id), isActive: admin.isActive });
  } catch (err) {
    req.log.error({ err }, "Toggle active error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admins/:id", requireSuperAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Admin deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admins/:id/store-stats", requireSuperAdmin, async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.params.id }).select("_id");
    if (!store) { res.json({ tryOnCount: 0, adsCount: 0 }); return; }
    const storeId = String(store._id);
    const agg = await Product.aggregate([
      { $match: { storeId } },
      { $group: { _id: null, total: { $sum: "$tryOnLikeCount" } } },
    ]);
    const tryOnCount: number = agg[0]?.total ?? 0;
    res.json({ tryOnCount, adsCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Store stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
