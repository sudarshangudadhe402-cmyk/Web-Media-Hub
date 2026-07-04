import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/auth";
import { DynamicPricing } from "../models/DynamicPricing";
import { findPartnerCoupon } from "../services/partnerCouponService";

const router = Router();

async function getOrCreate() {
  const doc = await DynamicPricing.findById("pricing-v2");
  if (!doc) {
    return await DynamicPricing.create({ _id: "pricing-v2", plans: [] });
  }
  return doc;
}

// GET /api/pricing — list plans (flat list, no category/store grouping)
router.get("/pricing", async (req, res) => {
  try {
    const doc = await getOrCreate();
    const search = (req.query.search as string)?.trim().toLowerCase();

    let plans = doc.plans as any[];

    if (search) {
      plans = plans.filter(
        (p: any) =>
          p.name.toLowerCase().includes(search) ||
          p.price.toLowerCase().includes(search) ||
          String(p.durationDays ?? "").includes(search)
      );
    }

    res.json({ plans: plans.map(planToJson) });
  } catch (err) {
    (req as any).log?.error({ err }, "Get pricing error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/pricing/plans — create plan
router.post("/pricing/plans", requireSuperAdmin, async (req, res) => {
  try {
    const { badgeText, name, price, durationDays, features, coupons } = req.body;
    if (!badgeText?.trim() || !name?.trim() || !price?.trim()) {
      res.status(400).json({ error: "badgeText, name, and price are required" });
      return;
    }
    const doc = await getOrCreate();
    (doc.plans as any[]).push({
      badgeText: badgeText.trim(),
      name: name.trim(),
      price: price.trim(),
      durationDays: durationDays ?? null,
      features: Array.isArray(features) ? features : [],
      coupons: Array.isArray(coupons) ? coupons : [],
    });
    await doc.save();
    const created = (doc.plans as any[])[(doc.plans as any[]).length - 1];
    res.status(201).json(planToJson(created));
  } catch (err) {
    (req as any).log?.error({ err }, "Create plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/pricing/plans/:id — update plan
router.put("/pricing/plans/:id", requireSuperAdmin, async (req, res) => {
  try {
    const doc = await getOrCreate();
    const plan = (doc.plans as any[]).find((p: any) => String(p._id) === req.params.id);
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

    const { badgeText, name, price, durationDays, features, coupons } = req.body;
    if (badgeText !== undefined) plan.badgeText = badgeText;
    if (name !== undefined) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (durationDays !== undefined) plan.durationDays = durationDays;
    if (features !== undefined) plan.features = features;
    if (coupons !== undefined) plan.coupons = coupons;

    await doc.save();
    res.json(planToJson(plan));
  } catch (err) {
    (req as any).log?.error({ err }, "Update plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/pricing/plans/:id — delete plan
router.delete("/pricing/plans/:id", requireSuperAdmin, async (req, res) => {
  try {
    const doc = await getOrCreate();
    const before = (doc.plans as any[]).length;
    (doc as any).plans = (doc.plans as any[]).filter((p: any) => String(p._id) !== req.params.id);
    if ((doc.plans as any[]).length === before) {
      res.status(404).json({ error: "Plan not found" }); return;
    }
    await doc.save();
    res.json({ success: true });
  } catch (err) {
    (req as any).log?.error({ err }, "Delete plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/pricing/validate-coupon?code=XYZ&planId=ID — public coupon validation
router.get("/pricing/validate-coupon", async (req, res) => {
  try {
    const code = (req.query.code as string)?.trim().toUpperCase();
    const planId = (req.query.planId as string)?.trim();

    if (!code) { res.status(400).json({ valid: false, error: "Coupon code required" }); return; }
    if (!planId) { res.status(400).json({ valid: false, error: "Plan ID required" }); return; }

    const doc = await getOrCreate();
    const plan = (doc.plans as any[]).find((p: any) => String(p._id) === planId);
    if (!plan) { res.status(404).json({ valid: false, error: "Plan not found" }); return; }

    // Helper: parse price string like "₹5,999" → 5999
    function parsePrice(str: string): number {
      const n = parseFloat(str.replace(/[^\d.]/g, ""));
      return isNaN(n) ? 0 : n;
    }
    function formatPrice(n: number): string {
      return `₹${Math.round(n).toLocaleString("en-IN")}`;
    }

    const originalPrice = plan.price as string;
    const originalNum = parsePrice(originalPrice);

    // 1. Check plan-specific coupons first
    const planCoupons: any[] = Array.isArray(plan.coupons) ? plan.coupons : [];
    const planCoupon = planCoupons.find((c: any) => c.code.toUpperCase() === code);
    if (planCoupon) {
      const remaining = planCoupon.maxUses - (planCoupon.usedCount ?? 0);
      if (remaining <= 0) {
        res.json({ valid: false, error: "Coupon limit reached" }); return;
      }
      res.json({
        valid: true,
        type: "plan",
        discountedPrice: planCoupon.discountedPrice,
        originalPrice,
        savings: originalNum > 0 ? formatPrice(originalNum - parsePrice(planCoupon.discountedPrice)) : null,
      });
      return;
    }

    // 2 & 3. Check partner coupons (influencer/ambassador — global, any plan)
    const partnerCoupon = await findPartnerCoupon(code);
    if (partnerCoupon) {
      const discountedNum = originalNum * (1 - partnerCoupon.discountPercent / 100);
      res.json({
        valid: true,
        type: partnerCoupon.type,
        discountedPrice: formatPrice(discountedNum),
        originalPrice,
        discountPercent: partnerCoupon.discountPercent,
        savings: formatPrice(originalNum - discountedNum),
        partnerName: partnerCoupon.partnerName,
      });
      return;
    }

    res.json({ valid: false, error: "Invalid or expired coupon code" });
  } catch (err) {
    (req as any).log?.error({ err }, "Validate coupon error");
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

// GET /api/pricing/plans/:id — get single plan (super admin, includes coupons)
router.get("/pricing/plans/:id", requireSuperAdmin, async (req, res) => {
  try {
    const doc = await getOrCreate();
    const plan = (doc.plans as any[]).find((p: any) => String(p._id) === req.params.id);
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
    res.json(planToJson(plan));
  } catch (err) {
    (req as any).log?.error({ err }, "Get plan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function planToJson(p: any) {
  return {
    id: String(p._id),
    badgeText: p.badgeText,
    name: p.name,
    price: p.price,
    durationDays: p.durationDays ?? null,
    features: p.features ?? [],
    coupons: p.coupons ?? [],
    createdAt: p.createdAt,
  };
}

export default router;
