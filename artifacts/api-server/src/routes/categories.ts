import { Router } from "express";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

async function getMyStore(userId: string) {
  return Store.findOne({ ownerId: userId });
}

router.get("/categories", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    if (!store) {
      res.json([]);
      return;
    }
    const categories = await Category.find({ storeId: String(store._id) }).sort({ createdAt: -1 });
    res.json(
      categories.map((c) => ({
        id: String(c._id),
        name: c.name,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    if (!store) {
      res.status(400).json({ error: "Store not found" });
      return;
    }
    const category = await Category.create({ name, storeId: String(store._id) });
    res.status(201).json({
      id: String(category._id),
      name: category.name,
      createdAt: category.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      res.status(400).json({ error: "Category already exists" });
      return;
    }
    req.log.error({ err }, "Create category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    if (!store) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const storeId = String(store._id);
    const category = await Category.findOneAndDelete({ _id: req.params.id, storeId });
    if (category) {
      await Product.deleteMany({ storeId, functionCategory: category.name });
    }
    res.json({ success: true, message: "Category and its products deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
