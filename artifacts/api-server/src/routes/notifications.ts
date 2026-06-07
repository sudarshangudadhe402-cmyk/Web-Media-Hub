import { Router } from "express";
import { Notification } from "../models/Notification";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

async function getMyStoreId(userId: string): Promise<string | null> {
  const store = await Store.findOne({ ownerId: userId }).select("_id").lean();
  return store ? String(store._id) : null;
}

router.get("/notifications", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const storeId = await getMyStoreId(userId);
    const filter = storeId ? { storeId } : { storeId: "__none__" };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
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

router.patch("/notifications/mark-read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const storeId = await getMyStoreId(userId);
    const filter = storeId ? { read: false, storeId } : { read: false, storeId: "__none__" };
    await Notification.updateMany(filter, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "Mark notifications read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
