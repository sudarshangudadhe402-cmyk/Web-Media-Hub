import { Router } from "express";
import { GlobalSettings } from "../models/GlobalSettings";
import { PricingSettings } from "../models/PricingSettings";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

// ── Global Link ──────────────────────────────────────────────────────────────

router.get("/settings/global-link", requireAuth, async (_req, res) => {
  try {
    const s = await GlobalSettings.findById("global");
    res.json({ globalLink: s?.globalLink ?? null });
  } catch (err) {
    (_req as any).log?.error({ err }, "Get global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/global-link", requireSuperAdmin, async (req, res) => {
  try {
    const { globalLink } = req.body;
    const s = await GlobalSettings.findByIdAndUpdate(
      "global",
      { globalLink: globalLink || null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ globalLink: s.globalLink });
  } catch (err) {
    (req as any).log?.error({ err }, "Put global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/settings/global-link", requireSuperAdmin, async (req, res) => {
  try {
    await GlobalSettings.findByIdAndUpdate("global", { globalLink: null });
    res.json({ globalLink: null });
  } catch (err) {
    (req as any).log?.error({ err }, "Delete global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Pricing Config ────────────────────────────────────────────────────────────

export const DEFAULT_PRICING_CONFIG = {
  demo: {
    displayName: "Starting Plan",
    displayBadge: "🧪 Try First",
    price: "₹999",
    displayPeriod: "/ Month ( 31 Day )",
    shortPeriod: "/ Month",
    tagline: "Perfect for testing the platform before upgrading.",
    features: ["Full Feature Access", "2 Store Login", "Virtual Try-On", "Loyalty Card", "AI Promotional Videos", "Online Booking", "Live Notifications"],
    highlights: ["Low investment to get started", "Full access to all features", "Upgrade anytime"],
    savingsNote: null,
    subscriptionDays: 30,
  },
  premium: {
    displayName: "Premium Annual Plan",
    displayBadge: "⭐ MOST POPULAR CHOICE",
    price: "₹5,999",
    displayPeriod: "/ Year",
    shortPeriod: "/ Year",
    tagline: "Only around ₹16 per day",
    features: ["1 Store Login", "Virtual Try-On Experience", "Loyalty Card System", "AI Promotional Videos", "Online Booking System", "Smart Product Categories", "Live Customer Notifications", "Free Feature Updates", "Priority Support"],
    highlights: ["Low investment", "High return potential", "Ideal for growing clothing stores", "Recover cost with just a few extra sales", "Recommended for 80% of store owners"],
    savingsNote: null,
    subscriptionDays: 365,
  },
  lifetime: {
    displayName: "Lifetime Business Plan",
    displayBadge: "🏆 HIGHEST VALUE",
    price: "₹15,999",
    displayPeriod: "One-Time",
    shortPeriod: "One-Time",
    tagline: "Pay Once. Use Forever.",
    features: ["Everything in Premium Annual", "Lifetime Access, No Renewal Ever", "4 Store Login", "₹2000 Web Media Hub Coin", "Future Feature Updates", "Priority Support"],
    highlights: ["One-time investment", "No yearly payments", "Better ROI after first year", "Business asset for life", "Long-term savings"],
    savingsNote: "🔥 Save ₹8,000+ Compared To Renewing Every Year",
    subscriptionDays: null,
  },
  enterprise: {
    displayName: "Enterprise Plan",
    displayBadge: "👑 PREMIUM BRAND",
    price: "₹19,999",
    displayPeriod: "One-Time",
    shortPeriod: "One-Time",
    tagline: "Designed for large stores and premium brands.",
    features: ["Unlimited Store Login  ∞", "₹4000 Web Media Hub Coin", "Premium AI Resources", "Early Access Features", "VIP Support"],
    highlights: [],
    savingsNote: null,
    subscriptionDays: null,
  },
};

router.get("/settings/pricing", async (_req, res) => {
  try {
    const s = await PricingSettings.findById("pricing");
    if (s?.plans) {
      res.json({ plans: s.plans });
    } else {
      res.json({ plans: DEFAULT_PRICING_CONFIG });
    }
  } catch (err) {
    (_req as any).log?.error({ err }, "Get pricing error");
    res.json({ plans: DEFAULT_PRICING_CONFIG });
  }
});

router.put("/settings/pricing", requireSuperAdmin, async (req, res) => {
  try {
    const { plans } = req.body;
    if (!plans || typeof plans !== "object") {
      res.status(400).json({ error: "plans object is required" });
      return;
    }

    const planKeys = ["demo", "premium", "lifetime", "enterprise"] as const;
    const requiredFields = ["displayName", "displayBadge", "price", "displayPeriod", "shortPeriod", "tagline"];

    for (const key of planKeys) {
      if (!plans[key]) {
        res.status(400).json({ error: `Missing plan: ${key}` });
        return;
      }
      for (const field of requiredFields) {
        if (typeof plans[key][field] !== "string" || !plans[key][field].trim()) {
          res.status(400).json({ error: `${key}.${field} is required` });
          return;
        }
      }
      if (!Array.isArray(plans[key].features)) {
        res.status(400).json({ error: `${key}.features must be an array` });
        return;
      }
    }

    const updated = await PricingSettings.findByIdAndUpdate(
      "pricing",
      { plans },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ plans: updated.plans });
  } catch (err) {
    (req as any).log?.error({ err }, "Put pricing error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
