import { Router } from "express";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { requireSuperAdmin } from "../middlewares/auth";
import { PricingSettings } from "../models/PricingSettings";
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
        storeType: a.storeType ?? "",
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List admins error");
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
