import { Router } from "express";
import { StoreRequest } from "../models/StoreRequest";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { Notification } from "../models/Notification";

const router = Router();

const REWARD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";

function generateRewardCode(email: string): string {
  const prefix = email
    .split("@")[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
  const random = Array.from(
    { length: 7 },
    () => REWARD_CHARS[Math.floor(Math.random() * REWARD_CHARS.length)]
  ).join("");
  return prefix + random;
}

function fmt(s: InstanceType<typeof StoreRequest>) {
  return {
    id: String(s._id),
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

// ── Public duplicate check (no auth needed — user hasn't registered yet) ──
router.post("/store-requests/check-duplicate", async (req: any, res) => {
  try {
    const { email, whatsapp } = req.body as { email?: string; whatsapp?: string };
    let emailTaken = false;
    let whatsappTaken = false;

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const [byRequest, byUser] = await Promise.all([
        StoreRequest.findOne({ email: emailLower }),
        User.findOne({ email: emailLower }),
      ]);
      emailTaken = !!(byRequest || byUser);
    }

    if (whatsapp) {
      const clean = whatsapp.replace(/\D/g, "");
      const byRequest = await StoreRequest.findOne({
        $or: [
          { whatsapp: clean },
          { whatsapp: `+91${clean}` },
          { whatsapp: clean.replace(/^91/, "") },
        ],
      });
      whatsappTaken = !!byRequest;
    }

    res.json({ emailTaken, whatsappTaken });
  } catch (err) {
    req.log?.error?.({ err }, "Duplicate check error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/store-requests", requireAuth, async (req: any, res) => {
  try {
    const { email, password, storeName, whatsapp, plan, planName, planPrice, planPeriod, planBadge, planColor } = req.body;
    if (!email || !password || !storeName || !whatsapp) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    const existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) {
      res.status(400).json({ error: "Email already exists, please use a different email" });
      return;
    }

    // Duplicate mobile check — strip non-digits for comparison
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone) {
      const existingMobile = await User.findOne({
        $or: [
          { adminNumber: cleanPhone },
          { adminNumber: `+91${cleanPhone}` },
          { adminNumber: cleanPhone.replace(/^91/, "") },
        ],
      });
      if (existingMobile) {
        res.status(400).json({ error: "Mobile number already exists, please use a different WhatsApp number" });
        return;
      }
    }

    const request = await StoreRequest.create({
      email: emailLower,
      password,
      storeName,
      whatsapp,
      plan: plan ?? planName ?? null,
      planName: planName ?? plan ?? "",
      planPrice: planPrice ?? "",
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
      status: "pending",
      submittedBy: req.user?.id ?? "unknown",
    });

    await Notification.create({
      type: "store_request",
      message: `New store request: "${storeName}" submitted for approval`,
      relatedId: String(request._id),
    });

    res.status(201).json(fmt(request));
  } catch (err) {
    req.log.error({ err }, "Create store request error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/store-requests", requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const requests = await StoreRequest.find(filter).sort({ createdAt: -1 });

    // Enrich each request with referrer admin info
    const referrerIds = [...new Set(requests.map((r) => r.submittedBy).filter(Boolean))];
    const [referrerUsers, referrerStores] = await Promise.all([
      User.find({ _id: { $in: referrerIds } }).select("_id email adminNumber").lean(),
      Store.find({ ownerId: { $in: referrerIds } }).select("ownerId name").lean(),
    ]);
    const userMap = new Map(referrerUsers.map((u: any) => [String(u._id), u]));
    const storeMap = new Map(referrerStores.map((s: any) => [String(s.ownerId), s]));

    const enriched = requests.map((r) => {
      const base = fmt(r);
      const refUser = userMap.get(r.submittedBy);
      const refStore = storeMap.get(r.submittedBy);
      return {
        ...base,
        referrerEmail: refUser ? refUser.email : null,
        referrerPhone: refUser ? refUser.adminNumber || null : null,
        referrerStoreName: refStore ? refStore.name : null,
      };
    });

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "List store requests error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function calcSubscriptionDates(planPeriod: string): { start: Date | null; end: Date | null } {
  const p = (planPeriod ?? "").toLowerCase();
  const now = new Date();
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

router.patch("/store-requests/:id/approve", requireSuperAdmin, async (req, res) => {
  try {
    const request = await StoreRequest.findById(req.params.id);
    if (!request) { res.status(404).json({ error: "Not found" }); return; }

    const existingUser = await User.findOne({ email: request.email });
    if (existingUser) {
      res.status(400).json({ error: "Email already exists — account may have already been created" });
      return;
    }

    const isStartingPlan = request.planName === "Starting Plan" || request.planPrice === "₹999";
    const rewardCode = isStartingPlan
      ? "NO_REWARD_MONTHLY_PLAN"
      : (request.rewardCode || generateRewardCode(request.email));

    request.status = "approved";
    request.rewardCode = rewardCode;
    await request.save();

    const autoUsername = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cleanPhone = request.whatsapp.replace(/\D/g, "").replace(/^91/, "");
    const { start, end } = calcSubscriptionDates(request.planPeriod ?? "");

    await User.create({
      username: autoUsername,
      email: request.email,
      password: request.password,
      adminNumber: cleanPhone,
      role: "admin",
      planName: request.planName ?? request.plan ?? "",
      planPrice: request.planPrice ?? "",
      planPeriod: request.planPeriod ?? "",
      planBadge: request.planBadge ?? "",
      planColor: request.planColor ?? "",
      subscriptionStartDate: start,
      subscriptionEndDate: end,
    });

    await Notification.create({
      type: "store_request",
      message: `Store "${request.storeName}" has been approved and admin account created`,
      relatedId: String(request._id),
    });

    res.json(fmt(request));
  } catch (err) {
    req.log.error({ err }, "Approve store request error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/store-requests/:id/reject", requireSuperAdmin, async (req, res) => {
  try {
    const request = await StoreRequest.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!request) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(request));
  } catch (err) {
    req.log.error({ err }, "Reject store request error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
