import { Router } from "express";
import { LedgerEntry } from "../models/LedgerEntry";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

function fmt(e: InstanceType<typeof LedgerEntry>) {
  return {
    id: String(e._id),
    adminId: e.adminId,
    date: e.date ?? null,
    customerName: e.customerName,
    productCost: e.productCost ?? null,
    paymentStatus: e.paymentStatus,
    confirmed: e.confirmed ?? false,
    createdAt: (e as any).createdAt?.toISOString?.() ?? "",
    updatedAt: (e as any).updatedAt?.toISOString?.() ?? "",
  };
}

router.get("/ledger", requireAuth, requireDb, async (req: AuthRequest, res) => {
  try {
    const adminId = String(req.user!._id);
    const entries = await LedgerEntry.find({ adminId }).sort({ createdAt: 1 });
    res.json(entries.map(fmt));
  } catch (err) {
    req.log.error({ err }, "List ledger error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ledger/bulk", requireAuth, requireDb, async (req: AuthRequest, res) => {
  try {
    const adminId = String(req.user!._id);
    const count = Math.min(Math.max(1, Number(req.body.count) || 5), 20);
    const docs = Array.from({ length: count }, () => ({
      adminId,
      date: null,
      customerName: "",
      productCost: null,
      paymentStatus: "Pending" as const,
    }));
    const created = await LedgerEntry.insertMany(docs);
    res.status(201).json(created.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Bulk create ledger error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ledger", requireAuth, requireDb, async (req: AuthRequest, res) => {
  try {
    const adminId = String(req.user!._id);
    const { date, customerName, productCost, paymentStatus } = req.body;
    const entry = new LedgerEntry({
      adminId,
      date: date ?? null,
      customerName: customerName ?? "",
      productCost: productCost != null && productCost !== "" ? Number(productCost) : null,
      paymentStatus: paymentStatus ?? "Pending",
    });
    await entry.save();
    res.status(201).json(fmt(entry));
  } catch (err) {
    req.log.error({ err }, "Create ledger entry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/ledger/:id", requireAuth, requireDb, async (req: AuthRequest, res) => {
  try {
    const adminId = String(req.user!._id);
    const entry = await LedgerEntry.findOne({ _id: req.params.id, adminId });
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    const { date, customerName, productCost, paymentStatus } = req.body;
    if ("date" in req.body) entry.date = date ?? null;
    if ("customerName" in req.body) entry.customerName = customerName ?? "";
    if ("productCost" in req.body)
      entry.productCost = productCost != null && productCost !== "" ? Number(productCost) : null;
    if ("paymentStatus" in req.body) entry.paymentStatus = paymentStatus;
    if ("confirmed" in req.body) entry.confirmed = Boolean(req.body.confirmed);
    await entry.save();
    res.json(fmt(entry));
  } catch (err) {
    req.log.error({ err }, "Update ledger entry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/ledger/:id", requireAuth, requireDb, async (req: AuthRequest, res) => {
  try {
    const adminId = String(req.user!._id);
    const entry = await LedgerEntry.findOneAndDelete({ _id: req.params.id, adminId });
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete ledger entry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
