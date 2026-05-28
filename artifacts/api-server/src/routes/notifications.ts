import { Router } from "express";
import { Notification } from "../models/Notification";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    res.json(
      notifications.map((n) => ({
        id: String(n._id),
        type: n.type,
        message: n.message,
        read: n.read,
        relatedId: n.relatedId ?? null,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List notifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/mark-read", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "Mark notifications read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
