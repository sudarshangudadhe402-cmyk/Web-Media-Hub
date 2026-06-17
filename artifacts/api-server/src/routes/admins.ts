import { Router } from "express";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { requireSuperAdmin } from "../middlewares/auth";

const router = Router();

router.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).sort({ createdAt: -1 });

    const adminIds = admins.map((a) => String(a._id));
    const stores = await Store.find({ ownerId: { $in: adminIds } }).select("ownerId publicSlug name");

    const storeMap: Record<string, { publicSlug: string; name: string }> = {};
    for (const s of stores) {
      if (s.ownerId) storeMap[s.ownerId] = { publicSlug: s.publicSlug, name: s.name };
    }

    res.json(
      admins.map((a) => ({
        id: String(a._id),
        username: a.username,
        plainPassword: a.plainPassword ?? "",
        adminNumber: a.adminNumber ?? "",
        role: a.role,
        isActive: a.isActive !== false,
        multiDeviceAllowed: a.multiDeviceAllowed === true,
        storeSlug: storeMap[String(a._id)]?.publicSlug ?? null,
        storeName: storeMap[String(a._id)]?.name ?? null,
        planName: a.planName ?? "",
        planPrice: a.planPrice ?? "",
        planPeriod: a.planPeriod ?? "",
        planBadge: a.planBadge ?? "",
        planColor: a.planColor ?? "",
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
    const { username, password, adminNumber, planName, planPrice, planPeriod, planBadge, planColor } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const existing = await User.findOne({ username });
    if (existing) {
      res.status(400).json({ error: "Username already exists" });
      return;
    }

    if (adminNumber && adminNumber.trim()) {
      const existingMobile = await User.findOne({ adminNumber: adminNumber.trim(), role: "admin" });
      if (existingMobile) {
        res.status(400).json({ error: "Admin number already exists — this mobile number is already registered" });
        return;
      }
    }

    const admin = await User.create({
      username,
      password,
      plainPassword: password,
      adminNumber: adminNumber ?? "",
      role: "admin",
      isActive: true,
      planName: planName ?? "",
      planPrice: planPrice ?? "",
      planPeriod: planPeriod ?? "",
      planBadge: planBadge ?? "",
      planColor: planColor ?? "",
    });
    res.status(201).json({
      id: String(admin._id),
      username: admin.username,
      plainPassword: password,
      adminNumber: admin.adminNumber ?? "",
      role: admin.role,
      isActive: true,
      multiDeviceAllowed: false,
      storeSlug: null,
      storeName: null,
      planName: admin.planName ?? "",
      planPrice: admin.planPrice ?? "",
      planPeriod: admin.planPeriod ?? "",
      planBadge: admin.planBadge ?? "",
      planColor: admin.planColor ?? "",
      createdAt: admin.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create admin error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admins/:id/toggle-active", requireSuperAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }
    const updateFields: Record<string, unknown> = { isActive };
    if (!isActive) {
      updateFields.sessionId = null;
    }
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ id: String(admin._id), isActive: admin.isActive });
  } catch (err) {
    req.log.error({ err }, "Toggle active error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admins/:id/multi-device", requireSuperAdmin, async (req, res) => {
  try {
    const { multiDeviceAllowed } = req.body;
    if (typeof multiDeviceAllowed !== "boolean") {
      res.status(400).json({ error: "multiDeviceAllowed must be a boolean" });
      return;
    }
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { multiDeviceAllowed },
      { new: true }
    );
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }
    res.json({ id: String(admin._id), multiDeviceAllowed: admin.multiDeviceAllowed });
  } catch (err) {
    req.log.error({ err }, "Toggle multi-device error");
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
