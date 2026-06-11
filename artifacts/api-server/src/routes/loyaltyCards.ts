import { Router } from "express";
import { LoyaltyCard } from "../models/LoyaltyCard";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";

const router = Router();

function isValidMobile(mobile: string): boolean {
  if (!/^\d{10}$/.test(mobile)) return false;
  if (/^(\d)\1{9}$/.test(mobile)) return false;
  const spam = ["1234567890", "0123456789", "9876543210", "1111111111", "0000000000"];
  return !spam.includes(mobile);
}

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 3) return false;
  if (/\d/.test(trimmed)) return false;
  if (/^[^a-zA-Z]*$/.test(trimmed)) return false;
  return true;
}

router.post("/public/loyalty-card/request", async (req, res) => {
  try {
    const { storeSlug, customerName, mobileNumber, password } = req.body;

    if (!storeSlug || !customerName || !mobileNumber || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (!isValidName(customerName)) {
      res.status(400).json({ error: "Please enter a valid real name (no fake names or numbers allowed)" });
      return;
    }

    if (!isValidMobile(mobileNumber)) {
      res.status(400).json({ error: "Please enter a valid 10-digit mobile number (repeated/spam numbers not allowed)" });
      return;
    }

    if (!/^\d{10}$/.test(password)) {
      res.status(400).json({ error: "Password must be exactly 10 digits" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    const existingByName = await LoyaltyCard.findOne({
      storeId,
      customerName: new RegExp(`^${customerName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      status: { $ne: "rejected" },
    });
    if (existingByName) {
      res.status(409).json({ error: "This name already has a Loyalty card. Please try a different name." });
      return;
    }

    const existingByMobile = await LoyaltyCard.findOne({
      storeId,
      mobileNumber,
      status: { $ne: "rejected" },
    });
    if (existingByMobile) {
      res.status(409).json({ error: "This number already has a Loyalty card. Please try a different number." });
      return;
    }

    const card = await LoyaltyCard.create({
      storeId,
      customerName: customerName.trim(),
      mobileNumber,
      password,
      status: "requested",
      requestedAt: new Date(),
    });

    res.status(201).json({
      id: String(card._id),
      customerName: card.customerName,
      mobileNumber: card.mobileNumber,
      status: card.status,
      requestedAt: card.requestedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/loyalty-card/status/:id", async (req, res) => {
  try {
    const card = await LoyaltyCard.findById(req.params.id).select(
      "status customerName mobileNumber requestedAt approvedAt rejectedAt"
    );
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json({
      id: String(card._id),
      status: card.status,
      customerName: card.customerName,
      mobileNumber: card.mobileNumber,
      requestedAt: card.requestedAt,
      approvedAt: card.approvedAt ?? null,
      rejectedAt: card.rejectedAt ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/loyalty-card/verify", async (req, res) => {
  try {
    const { storeSlug, customerName, mobileNumber, password } = req.body;

    if (!storeSlug || !customerName || !mobileNumber || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    const card = await LoyaltyCard.findOne({
      storeId,
      customerName: new RegExp(`^${customerName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      mobileNumber,
      password,
    });

    if (!card) {
      res.status(404).json({ error: "Loyalty card doesn't exist" });
      return;
    }

    if (card.status === "requested") {
      res.status(403).json({ error: "Your Loyalty card request is still pending approval" });
      return;
    }

    if (card.status === "rejected") {
      res.status(403).json({ error: "Your Loyalty card request was rejected" });
      return;
    }

    res.json({ valid: true, cardId: String(card._id), customerName: card.customerName });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/loyalty-card/login", async (req, res) => {
  try {
    const { storeSlug, customerName, password } = req.body;
    if (!storeSlug || !customerName || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    const storeId = String(store._id);

    const nameMatch = await LoyaltyCard.findOne({
      storeId,
      customerName: new RegExp(`^${customerName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (!nameMatch) {
      res.status(404).json({ error: "No Loyalty card found with this name", code: "name_not_found" });
      return;
    }

    if (nameMatch.password !== password) {
      res.status(401).json({ error: "Wrong password please try current password", code: "wrong_password" });
      return;
    }

    res.json({
      id: String(nameMatch._id),
      customerName: nameMatch.customerName,
      mobileNumber: nameMatch.mobileNumber,
      status: nameMatch.status,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/loyalty-card/recover", async (req, res) => {
  try {
    const { storeSlug, customerName, mobileNumber, password } = req.body;
    if (!storeSlug || !customerName || !mobileNumber || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    const storeId = String(store._id);
    const card = await LoyaltyCard.findOne({
      storeId,
      customerName: new RegExp(`^${customerName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      mobileNumber,
      password,
    });
    if (!card) {
      res.status(404).json({ error: "No Loyalty card found with these details" });
      return;
    }
    res.json({
      id: String(card._id),
      customerName: card.customerName,
      mobileNumber: card.mobileNumber,
      status: card.status,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/loyalty-cards", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      res.json({ requested: [], approved: [], rejected: [] });
      return;
    }

    const storeId = String(store._id);
    const cards = await LoyaltyCard.find({ storeId }).sort({ createdAt: -1 });

    const format = (c: InstanceType<typeof LoyaltyCard>) => ({
      id: String(c._id),
      customerName: c.customerName,
      mobileNumber: c.mobileNumber,
      password: c.password,
      status: c.status,
      requestedAt: c.requestedAt,
      approvedAt: c.approvedAt ?? null,
      rejectedAt: c.rejectedAt ?? null,
    });

    res.json({
      requested: cards.filter((c) => c.status === "requested").map(format),
      approved: cards.filter((c) => c.status === "approved").map(format),
      rejected: cards.filter((c) => c.status === "rejected").map(format),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/loyalty-cards/:id/approve", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      res.status(403).json({ error: "Store not found" });
      return;
    }

    const card = await LoyaltyCard.findOneAndUpdate(
      { _id: req.params.id, storeId: String(store._id) },
      { status: "approved", approvedAt: new Date() },
      { new: true }
    );

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    res.json({
      id: String(card._id),
      customerName: card.customerName,
      mobileNumber: card.mobileNumber,
      status: card.status,
      approvedAt: card.approvedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/loyalty-cards/:id/reject", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      res.status(403).json({ error: "Store not found" });
      return;
    }

    const card = await LoyaltyCard.findOneAndUpdate(
      { _id: req.params.id, storeId: String(store._id) },
      { status: "rejected", rejectedAt: new Date() },
      { new: true }
    );

    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    res.json({
      id: String(card._id),
      customerName: card.customerName,
      mobileNumber: card.mobileNumber,
      status: card.status,
      rejectedAt: card.rejectedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
