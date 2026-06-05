import { Router } from "express";
import { StoreRequest } from "../models/StoreRequest";
import { User } from "../models/User";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { Notification } from "../models/Notification";

const router = Router();

function fmt(s: InstanceType<typeof StoreRequest>) {
  return {
    id: String(s._id),
    username: s.username,
    storeName: s.storeName,
    whatsapp: s.whatsapp,
    status: s.status,
    submittedBy: s.submittedBy,
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

router.post("/store-requests", requireAuth, async (req: any, res) => {
  try {
    const { username, password, storeName, whatsapp } = req.body;
    if (!username || !password || !storeName || !whatsapp) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ error: "Username already exists, please try a different username" });
      return;
    }
    const request = await StoreRequest.create({
      username,
      password,
      storeName,
      whatsapp,
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
    res.json(requests.map(fmt));
  } catch (err) {
    req.log.error({ err }, "List store requests error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/store-requests/:id/approve", requireSuperAdmin, async (req, res) => {
  try {
    const request = await StoreRequest.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!request) { res.status(404).json({ error: "Not found" }); return; }

    const existingUser = await User.findOne({ username: request.username });
    if (existingUser) {
      await StoreRequest.findByIdAndUpdate(req.params.id, { status: "pending" });
      res.status(400).json({ error: "Username already exists, please try a different username" });
      return;
    }
    await User.create({
      username: request.username,
      password: request.password,
      plainPassword: request.password,
      role: "admin",
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
