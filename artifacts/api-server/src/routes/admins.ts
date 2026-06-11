import { Router } from "express";
import { User } from "../models/User";
import { requireSuperAdmin } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 });
    res.json(
      admins.map((a) => ({
        id: String(a._id),
        username: a.username,
        plainPassword: a.plainPassword ?? "",
        adminNumber: a.adminNumber ?? "",
        role: a.role,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List admins error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, adminNumber } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const existing = await User.findOne({ username });
    if (existing) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }

    const admin = await User.create({ username, password, plainPassword: password, adminNumber: adminNumber ?? "", role: "admin" });
    res.status(201).json({
      id: String(admin._id),
      username: admin.username,
      plainPassword: password,
      adminNumber: admin.adminNumber ?? "",
      role: admin.role,
      createdAt: admin.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create admin error");
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

export default router;
