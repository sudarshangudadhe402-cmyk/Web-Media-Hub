import { Router } from "express";
import { CustomerAccount } from "../models/CustomerAccount";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";

const router = Router();

function isValidMobile(mobile: string): boolean {
  if (!/^\d{10}$/.test(mobile)) return false;
  if (/^(\d)\1{9}$/.test(mobile)) return false;
  const spam = ["1234567890", "0123456789", "9876543210", "1111111111", "0000000000"];
  return !spam.includes(mobile);
}

router.post("/public/customer-account/signup", async (req, res) => {
  try {
    const { storeSlug, mobileNumber, password } = req.body;

    if (!storeSlug || !mobileNumber || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    if (!isValidMobile(mobileNumber)) {
      res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
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

    const existing = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (existing) {
      res.status(409).json({ error: "This number already has an account. Please try a different number.", code: "already_exists" });
      return;
    }

    const account = await CustomerAccount.create({ storeId, mobileNumber, password });

    res.status(201).json({
      id: String(account._id),
      mobileNumber: account.mobileNumber,
      createdAt: account.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/customer-account/signin", async (req, res) => {
  try {
    const { storeSlug, mobileNumber, password } = req.body;

    if (!storeSlug || !mobileNumber || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const store = await Store.findOne({ publicSlug: storeSlug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const storeId = String(store._id);

    const account = await CustomerAccount.findOne({ storeId, mobileNumber });
    if (!account) {
      res.status(404).json({ error: "No account found with this number", code: "not_found" });
      return;
    }

    if (account.password !== password) {
      res.status(401).json({ error: "Wrong password", code: "wrong_password" });
      return;
    }

    res.json({
      id: String(account._id),
      mobileNumber: account.mobileNumber,
      createdAt: account.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customer-accounts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    if (!store) {
      res.json([]);
      return;
    }

    const storeId = String(store._id);
    const accounts = await CustomerAccount.find({ storeId }).sort({ createdAt: -1 });

    res.json(accounts.map(a => ({
      id: String(a._id),
      mobileNumber: a.mobileNumber,
      password: a.password,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
