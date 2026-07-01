import { Router } from "express";
import { StoreRequest } from "../models/StoreRequest";
import { User } from "../models/User";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

function fmt(s: InstanceType<typeof StoreRequest>) {
  return {
    id: String(s._id),
    _id: String(s._id),
    email: s.email,
    storeName: s.storeName,
    whatsapp: s.whatsapp,
    plan: s.plan ?? null,
    planName: s.planName ?? s.plan ?? null,
    planPrice: s.planPrice ?? null,
    planPeriod: s.planPeriod ?? null,
    planBadge: s.planBadge ?? null,
    planColor: s.planColor ?? null,
    status: s.status,
    submittedBy: s.submittedBy,
    rewardCode: s.rewardCode ?? null,
    referred_by_admin_username: s.referred_by_admin_username ?? "",
    createdAt: s.createdAt.toISOString(),
    updatedAt: (s as any).updatedAt ? new Date((s as any).updatedAt).toISOString() : s.createdAt.toISOString(),
  };
}

router.get("/store-requests/my", requireAuth, async (req: any, res) => {
  try {
    const requests = await StoreRequest.find({ submittedBy: req.user?.id }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log.error({ err }, "My store requests error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin referral history (stores created via this admin's referral link) ──
router.get("/store-requests/my-referrals", requireAuth, async (req: any, res) => {
  try {
    const adminUser = await User.findById(req.user?.id).select("username").lean() as any;
    if (!adminUser?.username) {
      res.json([]);
      return;
    }
    const requests = await StoreRequest.find({
      referred_by_admin_username: adminUser.username,
    }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log?.error?.({ err }, "My referrals error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Super admin: all admin-to-admin referral history ──
router.get("/store-requests/referral-history", requireSuperAdmin, async (req: any, res) => {
  try {
    const requests = await StoreRequest.find({
      referred_by_admin_username: { $ne: "", $exists: true },
    }).sort({ createdAt: -1 });
    res.json(requests.map(fmt));
  } catch (err) {
    req.log?.error?.({ err }, "Referral history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
