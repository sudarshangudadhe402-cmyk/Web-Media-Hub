import { Router } from "express";
import { Category } from "../models/Category";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
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

router.post("/categories", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const category = await Category.create({ name });
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

router.delete("/categories/:id", requireAuth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
