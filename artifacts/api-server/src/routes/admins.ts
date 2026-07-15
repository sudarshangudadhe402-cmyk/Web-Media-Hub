import { Router } from "express";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { requireSuperAdmin } from "../middlewares/auth";
import { StoreRequest } from "../models/StoreRequest";
import { RevenuePayment } from "../models/RevenuePayment";

const router = Router();


// ── Referral rewards: admins who referred others via referral link ────────────
router.get("/admins/referral-rewards", requireSuperAdmin, async (req, res) => {
  try {
    // Find all StoreRequests where someone was referred by an admin
    const referrals = await StoreRequest.find({
      referred_by_admin_username: { $exists: true, $ne: "" },
      rewardCode: { $exists: true, $ne: "" },
    })
      .select("email storeName referred_by_admin_username rewardCode planName createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (referrals.length === 0) { res.json({ referrals: [] }); return; }

    // Look up referrer admin details (username → store info)
    const referrerUsernames = [...new Set(referrals.map((r: any) => r.referred_by_admin_username as string))];
    const referrerUsers = await User.find({ username: { $in: referrerUsernames } })
      .select("_id username email adminNumber")
      .lean();

    // Get store names for referrer admins
    const referrerIds = referrerUsers.map((u: any) => String(u._id));
    const referrerStores = await Store.find({ ownerId: { $in: referrerIds } }).select("ownerId name").lean();
    const referrerStoreMap: Record<string, string> = {};
    for (const s of referrerStores) {
      referrerStoreMap[String((s as any).ownerId)] = (s as any).name ?? "";
    }

    const referrerUserMap: Record<string, { email: string; adminNumber: string; storeName: string; userId: string }> = {};
    for (const u of referrerUsers) {
      const uid = String((u as any)._id);
      referrerUserMap[(u as any).username] = {
        userId: uid,
        email: (u as any).email ?? "",
        adminNumber: (u as any).adminNumber ?? "",
        storeName: referrerStoreMap[uid] ?? "",
      };
    }

    res.json({
      referrals: referrals.map((r: any) => ({
        id: String(r._id),
        rewardCode: r.rewardCode,
        date: r.createdAt,
        // Who referred
        referrerUsername: r.referred_by_admin_username,
        referrer: referrerUserMap[r.referred_by_admin_username] ?? null,
        // Who was referred (new admin)
        referredEmail: r.email,
        referredStoreName: r.storeName,
        referredPlan: r.planName ?? "",
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Referral rewards error");
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

/** Deterministic 10-char Store ID: 3 letters from store name + 7 from Mongo _id hex */
function generateStoreId(storeName: string, storeObjectId: string): string {
  const namePart = storeName
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const idPart = storeObjectId.replace(/[^a-fA-F0-9]/g, "").substring(0, 7).toUpperCase();
  return namePart + idPart; // exactly 10 chars
}

router.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 });

    const adminIds = admins.map((a) => String(a._id));
    const stores = await Store.find({ ownerId: { $in: adminIds } }).select("ownerId publicSlug name createdAt");

    const storeMap: Record<string, { publicSlug: string; name: string; storeObjId: string; createdAt: Date | null }> = {};
    for (const s of stores) {
      if (s.ownerId) storeMap[s.ownerId] = { publicSlug: s.publicSlug, name: s.name, storeObjId: String(s._id), createdAt: (s as any).createdAt ?? null };
    }

    res.json(
      admins.map((a) => {
        const sid = String(a._id);
        const sData = storeMap[sid];
        const sName = sData?.name ?? "";
        const sObjId = sData?.storeObjId ?? sid;
        return {
        id: sid,
        username: a.username,
        email: a.email ?? "",
        adminNumber: a.adminNumber ?? "",
        role: a.role,
        isActive: a.isActive !== false,
        activeSessionCount: (a.activeSessions ?? []).length,
        storeId: sName ? generateStoreId(sName, sObjId) : generateStoreId(a.username, sid),
        storeSlug: sData?.publicSlug ?? null,
        storeName: sName || null,
        storeCreatedAt: sData?.createdAt?.toISOString() ?? null,
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
        };
      })
    );
  } catch (err) {
    req.log.error({ err }, "List admins error");
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/admins/:id", requireSuperAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.params.id).lean() as any;
    if (!admin || admin.role !== "admin") { res.status(404).json({ error: "Admin not found" }); return; }

    const store = await Store.findOne({ ownerId: String(admin._id) }).lean() as any;

    const sName = store?.name ?? "";
    const sObjId = store ? String(store._id) : String(admin._id);
    res.json({
      id: String(admin._id),
      storeId: sName ? generateStoreId(sName, sObjId) : generateStoreId(admin.username, String(admin._id)),
      email: admin.email ?? "",
      adminNumber: admin.adminNumber ?? "",
      isActive: admin.isActive !== false,
      activeSessionCount: (admin.activeSessions ?? []).length,
      // Plan
      planName: admin.planName ?? "",
      planPrice: admin.planPrice ?? "",
      planPeriod: admin.planPeriod ?? "",
      planBadge: admin.planBadge ?? "",
      planColor: admin.planColor ?? "",
      subscriptionStartDate: admin.subscriptionStartDate ? admin.subscriptionStartDate.toISOString() : null,
      subscriptionEndDate: admin.subscriptionEndDate ? admin.subscriptionEndDate.toISOString() : null,
      autopayStatus: admin.autopayStatus ?? "none",
      // Store
      storeName: sName,
      storeAddress: store?.address ?? "",
      storeWhatsapp: store?.whatsappNumber ?? "",
      storeOpeningTime: store?.openingTime ?? "",
      storeOpenDays: store?.openDays ?? "",
      storeDescription: store?.description ?? "",
      storeBannerImage: store?.bannerImage ?? "",
      // Meta
      storeType: admin.storeType ?? "",
      signupSource: admin.signup_source ?? "ORGANIC",
      createdAt: admin.createdAt ? admin.createdAt.toISOString() : "",
      // Location (City model se linked)
      storeState: admin.storeState ?? "",
      storeCity: admin.storeCity ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "Admin detail error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /admins/:id/location — assign storeState + storeCity to an admin ──
router.patch("/admins/:id/location", requireSuperAdmin, async (req, res) => {
  try {
    const { storeState, storeCity } = req.body as { storeState?: string; storeCity?: string };
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { storeState: (storeState ?? "").trim(), storeCity: (storeCity ?? "").trim() },
      { new: true }
    );
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }
    res.json({ id: String(admin._id), storeState: admin.storeState ?? "", storeCity: admin.storeCity ?? "" });
  } catch (err) {
    req.log.error({ err }, "Location update error");
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
