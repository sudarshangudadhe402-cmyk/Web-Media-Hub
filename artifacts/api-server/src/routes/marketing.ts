import { Router, Response } from "express";
import { requireSuperAdmin, AuthRequest } from "../middlewares/auth";
import { User } from "../models/User";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { ReferralCode } from "../models/ReferralCode";
import { MarketingSourceConfig } from "../models/MarketingSourceConfig";
import { BuiltinSourceSetting } from "../models/BuiltinSourceSetting";
import { MarketingCategoryConfig } from "../models/MarketingCategoryConfig";
import { RevenuePayment } from "../models/RevenuePayment";

const router = Router();

async function getOrCreateCategoryConfig() {
  const raw = await MarketingCategoryConfig.findById("marketing-categories-v1").lean() as any;
  if (!raw) {
    return await MarketingCategoryConfig.create({ _id: "marketing-categories-v1", categories: [], storeTypes: [] });
  }
  return (await MarketingCategoryConfig.findById("marketing-categories-v1"))!;
}

const SOURCES = [
  "ORGANIC","GOOGLE_AD","FACEBOOK_AD","INSTAGRAM_AD",
  "YOUTUBE","REFERRAL","AMBASSADOR","INFLUENCER",
  "AFFILIATE","WHATSAPP","DIRECT",
];

const SOURCE_LABELS: Record<string, string> = {
  ORGANIC: "Organic",
  GOOGLE_AD: "Google Ad",
  FACEBOOK_AD: "Facebook Ad",
  INSTAGRAM_AD: "Instagram Ad",
  YOUTUBE: "YouTube",
  REFERRAL: "Referral",
  AMBASSADOR: "Ambassador",
  INFLUENCER: "Influencer",
  AFFILIATE: "Affiliate",
  WHATSAPP: "WhatsApp",
  DIRECT: "Direct",
};

const SOURCE_COLORS: Record<string, string> = {
  ORGANIC: "#22c55e",
  GOOGLE_AD: "#3b82f6",
  FACEBOOK_AD: "#6366f1",
  INSTAGRAM_AD: "#ec4899",
  YOUTUBE: "#ef4444",
  REFERRAL: "#f59e0b",
  AMBASSADOR: "#8b5cf6",
  INFLUENCER: "#06b6d4",
  AFFILIATE: "#f97316",
  WHATSAPP: "#10b981",
  DIRECT: "#6b7280",
};

function parsePlanPrice(priceStr: any): number {
  if (priceStr === undefined || priceStr === null || priceStr === "") return 0;
  if (typeof priceStr === "number") return isNaN(priceStr) ? 0 : priceStr;
  const cleaned = String(priceStr).replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function buildDateFilter(range: string, from?: string, to?: string) {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now); start.setHours(0,0,0,0);
    return { $gte: start };
  }
  if (range === "7d") {
    const start = new Date(now); start.setDate(start.getDate() - 7);
    return { $gte: start };
  }
  if (range === "30d") {
    const start = new Date(now); start.setDate(start.getDate() - 30);
    return { $gte: start };
  }
  if (range === "90d") {
    const start = new Date(now); start.setDate(start.getDate() - 90);
    return { $gte: start };
  }
  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { $gte: start };
  }
  if (range === "custom" && from && to) {
    return { $gte: new Date(from), $lte: new Date(to) };
  }
  return undefined;
}

/* ── helper: build known-source lookup including custom sources ── */
async function buildSourceLookup() {
  const customSources = await MarketingSourceConfig.find().lean();
  const customMap: Record<string, { label: string; color: string }> = {};
  for (const s of customSources as any[]) {
    customMap[s.key] = { label: s.label, color: s.color };
  }
  const allKnownKeys = [...SOURCES, ...Object.keys(customMap)];
  function labelFor(key: string) { return SOURCE_LABELS[key] || customMap[key]?.label || key; }
  function colorFor(key: string) { return SOURCE_COLORS[key] || customMap[key]?.color || "#6b7280"; }
  return { customMap, allKnownKeys, labelFor, colorFor };
}

/* ── PARTNER COUNTS (live) ── */
router.get("/marketing/partner-counts", requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [influencer, ambassador, referral] = await Promise.all([
      Influencer.countDocuments(),
      Ambassador.countDocuments(),
      ReferralCode.countDocuments(),
    ]);
    res.json({ influencer, ambassador, referral });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

/* ── DASHBOARD ── */
router.get("/marketing/dashboard", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { range = "all", from, to } = req.query as Record<string, string>;
    const dateFilter = buildDateFilter(range, from, to);
    const createdAtQuery = dateFilter ? { createdAt: dateFilter } : {};

    const adminQuery = { role: "admin", ...createdAtQuery };

    const [allAdmins, influencers, ambassadors, { allKnownKeys, labelFor, colorFor }] = await Promise.all([
      User.find(adminQuery).select("signup_source planPrice planName createdAt").lean(),
      Influencer.find().lean(),
      Ambassador.find().lean(),
      buildSourceLookup(),
    ]);

    const totalAdmins = allAdmins.length;
    const totalPayingAdmins = allAdmins.filter(a => parsePlanPrice(a.planPrice) > 0).length;

    // Total Revenue — actual cumulative money collected (first-time signup payment +
    // every renewal charge), from the real payment event ledger. This replaces the old
    // "current plan price × admin" snapshot, which understated revenue for admins who
    // had already renewed one or more times.
    const revenueQuery = dateFilter ? { createdAt: dateFilter } : {};
    const allRevenuePayments = await RevenuePayment.find(revenueQuery).select("amount").lean();
    const totalRevenue = allRevenuePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Monthly data (last 12 months)
    const now = new Date();
    const monthlyMap: Record<string, { signups: number; revenue: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      monthlyMap[key] = { signups: 0, revenue: 0 };
    }
    for (const a of allAdmins) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].signups++;
        monthlyMap[key].revenue += parsePlanPrice(a.planPrice);
      }
    }
    const monthlySignups = Object.entries(monthlyMap).map(([month, v]) => ({ month, count: v.signups }));
    const monthlyRevenue = Object.entries(monthlyMap).map(([month, v]) => ({ month, revenue: v.revenue }));

    // This month revenue
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const monthlyRevenueValue = monthlyMap[thisMonthKey]?.revenue ?? 0;

    // New Signups Revenue vs Renewals Revenue — tracked separately from the
    // real payment event ledger (RevenuePayment), keyed by when the money was
    // actually collected, not by the admin's original signup date. This fixes
    // "This Month" showing ₹0 after a renewal even though revenue came in today.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thisMonthPayments = await RevenuePayment.find({
      createdAt: { $gte: monthStart, $lt: monthEnd },
    }).select("type amount").lean();
    const newSignupsRevenue = thisMonthPayments
      .filter(p => p.type === "signup")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const renewalsRevenue = thisMonthPayments
      .filter(p => p.type === "renewal")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // By source — includes custom sources
    const bySource = allKnownKeys.map(source => {
      const group = allAdmins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        label: labelFor(source),
        color: colorFor(source),
        signups: group.length,
        payingAdmins: group.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      };
    });

    // Deleted source bucket — admins whose source no longer exists
    const deletedGroup = allAdmins.filter(a => !allKnownKeys.includes(a.signup_source || "ORGANIC"));
    if (deletedGroup.length > 0) {
      bySource.push({
        source: "__DELETED__",
        label: "Deleted Source",
        color: "#ef4444",
        signups: deletedGroup.length,
        payingAdmins: deletedGroup.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        revenue: deletedGroup.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      });
    }

    // Monthly by source — last 6 months, for mini sparkline charts
    const last6Keys = Object.keys(monthlyMap).slice(-6);
    const bySourceMonthly: Record<string, { month: string; signups: number; revenue: number }[]> = {};
    for (const source of [...allKnownKeys, "__DELETED__"]) {
      bySourceMonthly[source] = last6Keys.map(key => ({ month: key, signups: 0, revenue: 0 }));
    }
    for (const a of allAdmins) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      if (!last6Keys.includes(key)) continue;
      const src = allKnownKeys.includes(a.signup_source || "ORGANIC")
        ? (a.signup_source || "ORGANIC")
        : "__DELETED__";
      if (bySourceMonthly[src]) {
        const idx = bySourceMonthly[src].findIndex(m => m.month === key);
        if (idx !== -1) {
          bySourceMonthly[src][idx].signups++;
          bySourceMonthly[src][idx].revenue += parsePlanPrice(a.planPrice);
        }
      }
    }

    res.json({
      totalAdmins,
      totalPayingAdmins,
      totalRevenue,
      monthlyRevenue: monthlyRevenueValue,
      newSignupsRevenue,
      renewalsRevenue,
      bySource,
      bySourceMonthly,
      monthlySignups,
      monthlyRevenueChart: monthlyRevenue,
      topInfluencers: influencers.sort((a,b) => b.total_revenue - a.total_revenue).slice(0,5),
      topAmbassadors: ambassadors.sort((a,b) => b.total_revenue - a.total_revenue).slice(0,5),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/* ── INFLUENCERS ── */
router.get("/marketing/influencers", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const list = await Influencer.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/marketing/influencers", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, coupon_code, commission_percentage, customer_discount_percentage } = req.body;
    if (!name || !coupon_code) { res.status(400).json({ error: "name and coupon_code required" }); return; }
    const inf = await Influencer.create({ name, email: email ?? "", coupon_code: coupon_code.toUpperCase(), commission_percentage: commission_percentage ?? 0, customer_discount_percentage: customer_discount_percentage ?? 0 });
    res.status(201).json(inf);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Coupon code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/influencers/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, coupon_code, commission_percentage, customer_discount_percentage } = req.body;
    const inf = await Influencer.findByIdAndUpdate(
      req.params.id,
      { name, email: email ?? "", coupon_code: coupon_code?.toUpperCase(), commission_percentage, customer_discount_percentage },
      { new: true }
    );
    if (!inf) { res.status(404).json({ error: "Not found" }); return; }
    res.json(inf);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/marketing/influencers/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Influencer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── AMBASSADORS ── */
router.get("/marketing/ambassadors", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const list = await Ambassador.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/marketing/ambassadors", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, city, referral_code, commission_percentage, customer_discount_percentage } = req.body;
    if (!name || !referral_code) { res.status(400).json({ error: "name and referral_code required" }); return; }
    const amb = await Ambassador.create({ name, email: email ?? "", city: city ?? "", referral_code: referral_code.toUpperCase(), commission_percentage: commission_percentage ?? 0, customer_discount_percentage: customer_discount_percentage ?? 0 });
    res.status(201).json(amb);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Referral code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/ambassadors/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, city, referral_code, commission_percentage, customer_discount_percentage } = req.body;
    const amb = await Ambassador.findByIdAndUpdate(
      req.params.id,
      { name, email: email ?? "", city, referral_code: referral_code?.toUpperCase(), commission_percentage, customer_discount_percentage },
      { new: true }
    );
    if (!amb) { res.status(404).json({ error: "Not found" }); return; }
    res.json(amb);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/marketing/ambassadors/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Ambassador.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── REFERRAL CODES ── */
router.get("/marketing/referral-codes", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const list = await ReferralCode.find().populate("owner_admin_id", "username email").sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/marketing/referral-codes", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { owner_admin_id, referral_code, commission_percentage, customer_discount_percentage } = req.body;
    if (!owner_admin_id || !referral_code) { res.status(400).json({ error: "owner_admin_id and referral_code required" }); return; }
    const rc = await ReferralCode.create({ owner_admin_id, referral_code: referral_code.toUpperCase(), commission_percentage: commission_percentage ?? 0, customer_discount_percentage: customer_discount_percentage ?? 0 });
    res.status(201).json(rc);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Referral code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/referral-codes/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commission_percentage, customer_discount_percentage } = req.body;
    const rc = await ReferralCode.findByIdAndUpdate(
      req.params.id,
      { commission_percentage: commission_percentage ?? 0, customer_discount_percentage: customer_discount_percentage ?? 0 },
      { new: true }
    );
    if (!rc) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rc);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/marketing/referral-codes/:id", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    await ReferralCode.findByIdAndDelete(_req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── MARKETING SOURCES ── */
router.get("/marketing/sources", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { range = "all", from, to } = req.query as Record<string, string>;
    const dateFilter = buildDateFilter(range, from, to);
    const q = { role: "admin", ...(dateFilter ? { createdAt: dateFilter } : {}) };
    const [admins, { allKnownKeys, labelFor, colorFor }] = await Promise.all([
      User.find(q).select("signup_source planPrice").lean(),
      buildSourceLookup(),
    ]);

    const sources = allKnownKeys.map(source => {
      const group = admins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        label: labelFor(source),
        color: colorFor(source),
        total_signups: group.length,
        total_paid_admins: group.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        total_revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      };
    }).sort((a,b) => b.total_signups - a.total_signups);

    // Deleted source bucket — admins whose source was removed
    const deletedGroup = admins.filter(a => !allKnownKeys.includes(a.signup_source || "ORGANIC"));
    if (deletedGroup.length > 0) {
      sources.push({
        source: "__DELETED__",
        label: "Deleted Source",
        color: "#ef4444",
        total_signups: deletedGroup.length,
        total_paid_admins: deletedGroup.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        total_revenue: deletedGroup.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      });
    }

    res.json(sources);
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── REVENUE ANALYTICS ── */
router.get("/marketing/revenue", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { range = "all", from, to } = req.query as Record<string, string>;
    const dateFilter = buildDateFilter(range, from, to);
    const q = { role: "admin", ...(dateFilter ? { createdAt: dateFilter } : {}) };
    const admins = await User.find(q).select("signup_source planPrice planName createdAt").lean();

    const { allKnownKeys, labelFor, colorFor } = await buildSourceLookup();

    const bySource = allKnownKeys.map(source => {
      const group = admins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        label: labelFor(source),
        color: colorFor(source),
        revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
        admins: group.length,
      };
    }).filter(s => s.revenue > 0).sort((a,b) => b.revenue - a.revenue);

    // Deleted bucket
    const deletedGroup = admins.filter(a => !allKnownKeys.includes(a.signup_source || "ORGANIC"));
    if (deletedGroup.length > 0) {
      const delRev = deletedGroup.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0);
      if (delRev > 0) bySource.push({ source: "__DELETED__", label: "Deleted Source", color: "#ef4444", revenue: delRev, admins: deletedGroup.length });
    }

    // By plan
    const planMap: Record<string, { count: number; revenue: number }> = {};
    for (const a of admins) {
      const plan = a.planName || "Free";
      if (!planMap[plan]) planMap[plan] = { count: 0, revenue: 0 };
      planMap[plan].count++;
      planMap[plan].revenue += parsePlanPrice(a.planPrice);
    }
    const byPlan = Object.entries(planMap)
      .map(([plan, v]) => ({ plan, ...v }))
      .sort((a,b) => b.revenue - a.revenue);

    res.json({ bySource, byPlan, total: admins.reduce((s,a) => s + parsePlanPrice(a.planPrice), 0) });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── RENEWALS DETAIL (total renewal count + revenue + per-admin breakdown) ── */
router.get("/marketing/renewals-detail", requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const renewalPayments = await RevenuePayment.find({ type: "renewal" })
      .select("adminId amount")
      .lean();

    const totalRenewalCount = renewalPayments.length;
    const totalRenewalRevenue = renewalPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const perAdminMap: Record<string, { renewalCount: number; renewalRevenue: number }> = {};
    for (const p of renewalPayments) {
      const id = String(p.adminId);
      if (!perAdminMap[id]) perAdminMap[id] = { renewalCount: 0, renewalRevenue: 0 };
      perAdminMap[id].renewalCount++;
      perAdminMap[id].renewalRevenue += p.amount || 0;
    }

    const adminIds = Object.keys(perAdminMap);
    const admins = await User.find({ _id: { $in: adminIds } })
      .select("storeName username email planName planColor")
      .lean();

    const perAdmin = admins
      .map((a: any) => ({
        adminId: String(a._id),
        storeName: a.storeName || a.username || a.email || "—",
        planName: a.planName || "",
        planColor: a.planColor || "",
        renewalCount: perAdminMap[String(a._id)]?.renewalCount || 0,
        renewalRevenue: perAdminMap[String(a._id)]?.renewalRevenue || 0,
      }))
      .sort((a, b) => b.renewalCount - a.renewalCount);

    res.json({ totalRenewalCount, totalRenewalRevenue, perAdmin });
  } catch (err) {
    res.status(500).json({ error: "Failed to load renewals detail" });
  }
});

/* ── EXPORT ── */
router.get("/marketing/export/csv", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type = "admins" } = req.query as Record<string, string>;
    let csv = "";
    if (type === "influencers") {
      const list = await Influencer.find().lean();
      csv = "Name,Coupon Code,Commission %,Signups,Paying Admins,Revenue\n" +
        list.map(r => `${r.name},${r.coupon_code},${r.commission_percentage},${r.total_signups},${r.total_paid_admins},${r.total_revenue}`).join("\n");
    } else if (type === "ambassadors") {
      const list = await Ambassador.find().lean();
      csv = "Name,City,Referral Code,Commission %,Signups,Paying Admins,Revenue\n" +
        list.map(r => `${r.name},${r.city},${r.referral_code},${r.commission_percentage},${r.total_signups},${r.total_paid_admins},${r.total_revenue}`).join("\n");
    } else {
      const admins = await User.find({ role: "admin" }).select("username email signup_source coupon_code utm_source planName planPrice createdAt").lean();
      csv = "Username,Email,Signup Source,Coupon Code,UTM Source,Plan,Price,Created At\n" +
        admins.map(a => `${a.username},${a.email},${a.signup_source || "ORGANIC"},${a.coupon_code || ""},${a.utm_source || ""},${a.planName || ""},${a.planPrice || ""},${new Date(a.createdAt).toISOString()}`).join("\n");
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-export.csv"`);
    res.send(csv);
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── BUILTIN SOURCE SETTINGS (active/inactive toggle + label/color override) ── */
router.get("/marketing/sources/builtin", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const settings = await BuiltinSourceSetting.find().lean();
    const map: Record<string, { isActive: boolean; label_override: string; color_override: string }> = {};
    for (const s of settings as any[]) {
      map[s.key] = { isActive: s.isActive, label_override: s.label_override || "", color_override: s.color_override || "" };
    }
    res.json(map);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.patch("/marketing/sources/builtin/:key", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { isActive, label_override, color_override } = req.body;
    const update: any = {};
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof label_override === "string") update.label_override = label_override;
    if (typeof color_override === "string") update.color_override = color_override;
    if (Object.keys(update).length === 0) { res.status(400).json({ error: "No valid fields provided" }); return; }
    const setting = await BuiltinSourceSetting.findOneAndUpdate(
      { key },
      update,
      { upsert: true, new: true }
    );
    res.json(setting);
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── MARKETING STORE CATEGORIES (independent from Pricing categories) ── */
/* GET /api/marketing/categories-config — public: used by "Choose your shop" page pre-login */
router.get("/marketing/categories-config", async (_req, res: Response): Promise<void> => {
  try {
    const doc = await getOrCreateCategoryConfig();

    const typeToCategory: Record<string, string> = {};
    for (const st of doc.storeTypes as any[]) {
      if (st.name) typeToCategory[st.name] = st.category ?? "";
    }
    const adminDocs = await User.find({ role: "admin", storeType: { $ne: "" } }).select("storeType").lean();
    const storeTypeCounts: Record<string, number> = {};
    for (const a of adminDocs) {
      const t = (a as any).storeType as string;
      if (!t) continue;
      const cat = typeToCategory[t] ?? "";
      const key = cat ? `${t}::${cat}` : t;
      storeTypeCounts[key] = (storeTypeCounts[key] ?? 0) + 1;
    }

    res.json({ categories: doc.categories, storeTypes: doc.storeTypes, storeTypeCounts });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

/* POST /api/marketing/categories — add category */
router.post("/marketing/categories", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const cat = (name ?? "").trim();
    if (!cat) { res.status(400).json({ error: "name required" }); return; }
    const doc = await getOrCreateCategoryConfig();
    if (!(doc.categories as string[]).includes(cat)) {
      (doc.categories as string[]).push(cat);
      await doc.save();
    }
    res.json({ categories: doc.categories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* PUT /api/marketing/categories/:name — rename category */
router.put("/marketing/categories/:name", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oldName = req.params.name;
    const trimmed = (req.body.name ?? "").trim();
    if (!trimmed) { res.status(400).json({ error: "name required" }); return; }
    const doc = await getOrCreateCategoryConfig();
    const idx = (doc.categories as string[]).indexOf(oldName);
    if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
    (doc.categories as string[])[idx] = trimmed;
    for (const st of doc.storeTypes as any[]) {
      if (st.category === oldName) st.category = trimmed;
    }
    await doc.save();
    res.json({ categories: doc.categories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* DELETE /api/marketing/categories/:name — remove category */
router.delete("/marketing/categories/:name", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cat = req.params.name;
    const doc = await getOrCreateCategoryConfig();
    (doc as any).categories = (doc.categories as string[]).filter((c) => c !== cat);
    (doc as any).storeTypes = (doc.storeTypes as any[]).filter((s: any) => s.category !== cat);
    await doc.save();
    res.json({ categories: doc.categories });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* POST /api/marketing/store-types — add store type (requires name + category) */
router.post("/marketing/store-types", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stName = (req.body.name ?? "").trim();
    const stCat = (req.body.category ?? "").trim();
    if (!stName || !stCat) { res.status(400).json({ error: "name and category required" }); return; }
    const doc = await getOrCreateCategoryConfig();
    if (!(doc.categories as string[]).includes(stCat)) { res.status(400).json({ error: "Category does not exist" }); return; }
    const exists = (doc.storeTypes as any[]).some((s: any) => s.name === stName && s.category === stCat);
    if (!exists) {
      (doc.storeTypes as any[]).push({ name: stName, category: stCat });
      await doc.save();
    }
    res.json({ storeTypes: doc.storeTypes });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* PUT /api/marketing/store-types/:name — edit store type */
router.put("/marketing/store-types/:name", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oldName = req.params.name;
    const { name, category } = req.body;
    const doc = await getOrCreateCategoryConfig();
    const st = (doc.storeTypes as any[]).find((s: any) => s.name === oldName);
    if (!st) { res.status(404).json({ error: "Not found" }); return; }
    if (typeof name === "string" && name.trim()) st.name = name.trim();
    if (typeof category === "string" && category.trim()) {
      if (!(doc.categories as string[]).includes(category.trim())) { res.status(400).json({ error: "Category does not exist" }); return; }
      st.category = category.trim();
    }
    await doc.save();
    res.json({ storeTypes: doc.storeTypes });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* DELETE /api/marketing/store-types/:name — remove store type */
router.delete("/marketing/store-types/:name", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const st = req.params.name;
    const doc = await getOrCreateCategoryConfig();
    (doc as any).storeTypes = (doc.storeTypes as any[]).filter((s: any) => s.name !== st);
    await doc.save();
    res.json({ storeTypes: doc.storeTypes });
  } catch { res.status(500).json({ error: "Failed" }); }
});

/* ── CUSTOM MARKETING SOURCES (Super Admin CRUD) ── */
router.get("/marketing/sources/config", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const custom = await MarketingSourceConfig.find().sort({ createdAt: 1 }).lean();
    res.json(custom);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/marketing/sources/config", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key, label, color } = req.body;
    if (!key || !label) { res.status(400).json({ error: "key and label required" }); return; }
    const src = await MarketingSourceConfig.create({ key: key.toUpperCase().replace(/\s+/g, "_"), label, color: color || "#6b7280" });
    res.status(201).json(src);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Source key already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/sources/config/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { label, color } = req.body;
    if (!label) { res.status(400).json({ error: "label required" }); return; }
    const src = await MarketingSourceConfig.findByIdAndUpdate(
      req.params.id,
      { label, color: color || "#6b7280" },
      { new: true }
    );
    if (!src) { res.status(404).json({ error: "Not found" }); return; }
    res.json(src);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/marketing/sources/config/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await MarketingSourceConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
