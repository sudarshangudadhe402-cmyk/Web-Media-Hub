import { Router } from "express";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { requireSuperAdmin } from "../middlewares/auth";
import { OtpCode } from "../models/OtpCode";
import { sendOtpEmail } from "../services/emailOtp";
import { PricingSettings } from "../models/PricingSettings";
import { DEFAULT_PRICING_CONFIG } from "./settings";

const router = Router();

function getLoginCapacity(planName: string, planPrice: string): number {
  if (planName === "Starting Plan" || planPrice === "₹999") return 2;
  if (planName === "Lifetime Business" || planPrice === "₹15,999") return 4;
  if (planName === "Enterprise" || planPrice === "₹19,999") return Infinity;
  return 1;
}

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
      res.status(400).json({ error: "Email already exists — this email is already registered" }); return;
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

// ── Verify OTP for admin email (called before create) ────────────────────────
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

    if (!record) { res.status(400).json({ error: "OTP expired or not found. Please request a new one." }); return; }
    if (record.code !== otp.trim()) { res.status(400).json({ error: "Incorrect OTP. Please try again." }); return; }

    record.used = true;
    await record.save();

    res.json({ verified: true });
  } catch (err) {
    req.log.error({ err }, "Verify admin creation OTP error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── All-admins try-on + ads stats (for Revenue page) ─────────────────────────
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
        loginCapacity: getLoginCapacity(a.planName ?? "", a.planPrice ?? ""),
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
    const { email, password, adminNumber, planKey, planName, planPrice, planPeriod, planBadge, planColor } = req.body;
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
      res.status(400).json({ error: "Email already exists — this email is already registered" });
      return;
    }

    if (adminNumber && adminNumber.trim()) {
      const existingMobile = await User.findOne({ adminNumber: adminNumber.trim(), role: "admin" });
      if (existingMobile) {
        res.status(400).json({ error: "Admin number already exists — this mobile number is already registered" });
        return;
      }
    }

    const pricingPlans = await getPricingPlans();
    const planCfg = planKey ? (pricingPlans as any)[planKey] : null;
    const subscriptionDays: number | null = planCfg?.subscriptionDays ?? null;

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
      planPrice: planPrice ?? "",
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
      subscriptionStartDate: start,
      subscriptionEndDate: end,
    });

    res.status(201).json({
      id: String(admin._id),
      username: admin.username,
      email: admin.email ?? "",
      adminNumber: admin.adminNumber ?? "",
      role: admin.role,
      isActive: true,
      activeSessionCount: 0,
      loginCapacity: getLoginCapacity(planName ?? "", planPrice ?? ""),
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

// Renew subscription — uses current pricing config for subscriptionDays
router.patch("/admins/:id/renew-subscription", requireSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    const pricingPlans = await getPricingPlans();
    const planKey = admin.planKey || "";
    const planCfg = planKey ? (pricingPlans as any)[planKey] : null;
    const subscriptionDays: number | null = planCfg?.subscriptionDays ?? null;

    const { start, end } = calcSubscriptionDates(subscriptionDays, admin.planPeriod ?? "");
    if (!end) {
      res.status(400).json({ error: "This plan does not have a subscription period" });
      return;
    }
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
    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }
    const updateFields: Record<string, unknown> = { isActive };
    if (!isActive) {
      updateFields.activeSessions = [];
    }
    const admin = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ id: String(admin._id), isActive: admin.isActive });
  } catch (err) {
    req.log.error({ err }, "Toggle active error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admins/:id/multi-device", requireSuperAdmin, async (req, res) => {
  try {
    const { multiDeviceAllowed } = req.body;
    if (typeof multiDeviceAllowed !== "boolean") {
      res.status(400).json({ error: "multiDeviceAllowed must be a boolean" });
      return;
    }
    const admin = await User.findByIdAndUpdate(req.params.id, { multiDeviceAllowed }, { new: true });
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ id: String(admin._id), multiDeviceAllowed: admin.multiDeviceAllowed });
  } catch (err) {
    req.log.error({ err }, "Toggle multi-device error");
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
    if (!store) {
      res.json({ tryOnCount: 0, adsCount: 0 });
      return;
    }
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
