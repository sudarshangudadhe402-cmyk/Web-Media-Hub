import { Router, Response } from "express";
import { requireSuperAdmin, AuthRequest } from "../middlewares/auth";
import { User } from "../models/User";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { ReferralCode } from "../models/ReferralCode";
import { MarketingSourceConfig } from "../models/MarketingSourceConfig";
import { BuiltinSourceSetting } from "../models/BuiltinSourceSetting";

const router = Router();

const SOURCES = [
  "ORGANIC","GOOGLE_AD","FACEBOOK_AD","INSTAGRAM_AD",
  "YOUTUBE","REFERRAL","AMBASSADOR","INFLUENCER",
  "AFFILIATE","WHATSAPP","DIRECT",
];

function parsePlanPrice(priceStr: string): number {
  if (!priceStr) return 0;
  const n = parseFloat(priceStr.replace(/[^\d.]/g, ""));
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

/* ── DASHBOARD ── */
router.get("/marketing/dashboard", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { range = "all", from, to } = req.query as Record<string, string>;
    const dateFilter = buildDateFilter(range, from, to);
    const createdAtQuery = dateFilter ? { createdAt: dateFilter } : {};

    const adminQuery = { role: "admin", ...createdAtQuery };

    const [allAdmins, influencers, ambassadors] = await Promise.all([
      User.find(adminQuery).select("signup_source planPrice planName createdAt").lean(),
      Influencer.find().lean(),
      Ambassador.find().lean(),
    ]);

    const totalAdmins = allAdmins.length;
    const totalPayingAdmins = allAdmins.filter(a => parsePlanPrice(a.planPrice) > 0).length;
    const totalRevenue = allAdmins.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0);

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

    // By source
    const bySource = SOURCES.map(source => {
      const group = allAdmins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        signups: group.length,
        payingAdmins: group.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      };
    });

    res.json({
      totalAdmins,
      totalPayingAdmins,
      totalRevenue,
      monthlyRevenue: monthlyRevenueValue,
      bySource,
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
    const { name, coupon_code, commission_percentage } = req.body;
    if (!name || !coupon_code) { res.status(400).json({ error: "name and coupon_code required" }); return; }
    const inf = await Influencer.create({ name, coupon_code: coupon_code.toUpperCase(), commission_percentage: commission_percentage ?? 0 });
    res.status(201).json(inf);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Coupon code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/influencers/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, coupon_code, commission_percentage } = req.body;
    const inf = await Influencer.findByIdAndUpdate(
      req.params.id,
      { name, coupon_code: coupon_code?.toUpperCase(), commission_percentage },
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
    const { name, city, referral_code, commission_percentage } = req.body;
    if (!name || !referral_code) { res.status(400).json({ error: "name and referral_code required" }); return; }
    const amb = await Ambassador.create({ name, city: city ?? "", referral_code: referral_code.toUpperCase(), commission_percentage: commission_percentage ?? 0 });
    res.status(201).json(amb);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Referral code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/marketing/ambassadors/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, city, referral_code, commission_percentage } = req.body;
    const amb = await Ambassador.findByIdAndUpdate(
      req.params.id,
      { name, city, referral_code: referral_code?.toUpperCase(), commission_percentage },
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
    const { owner_admin_id, referral_code } = req.body;
    if (!owner_admin_id || !referral_code) { res.status(400).json({ error: "owner_admin_id and referral_code required" }); return; }
    const rc = await ReferralCode.create({ owner_admin_id, referral_code: referral_code.toUpperCase() });
    res.status(201).json(rc);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: "Referral code already exists" }); return; }
    res.status(500).json({ error: "Failed" });
  }
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
    const admins = await User.find(q).select("signup_source planPrice").lean();

    const sources = SOURCES.map(source => {
      const group = admins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        total_signups: group.length,
        total_paid_admins: group.filter(a => parsePlanPrice(a.planPrice) > 0).length,
        total_revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
      };
    }).sort((a,b) => b.total_signups - a.total_signups);

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

    const bySource = SOURCES.map(source => {
      const group = admins.filter(a => (a.signup_source || "ORGANIC") === source);
      return {
        source,
        revenue: group.reduce((sum, a) => sum + parsePlanPrice(a.planPrice), 0),
        admins: group.length,
      };
    }).filter(s => s.revenue > 0).sort((a,b) => b.revenue - a.revenue);

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

/* ── BUILTIN SOURCE SETTINGS (active/inactive toggle) ── */
router.get("/marketing/sources/builtin", requireSuperAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const settings = await BuiltinSourceSetting.find().lean();
    // Return a map key → isActive; missing keys default to true
    const map: Record<string, boolean> = {};
    for (const s of settings) { map[s.key] = s.isActive; }
    res.json(map);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.patch("/marketing/sources/builtin/:key", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") { res.status(400).json({ error: "isActive (boolean) required" }); return; }
    const setting = await BuiltinSourceSetting.findOneAndUpdate(
      { key },
      { isActive },
      { upsert: true, new: true }
    );
    res.json(setting);
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

router.delete("/marketing/sources/config/:id", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await MarketingSourceConfig.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
