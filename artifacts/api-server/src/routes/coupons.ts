import { Router } from "express";
import { PricingSettings } from "../models/PricingSettings";
import { DEFAULT_PRICING_CONFIG } from "./settings";

const router = Router();

type PlanKey = "demo" | "premium" | "lifetime" | "enterprise";
const VALID_PLANS: PlanKey[] = ["demo", "premium", "lifetime", "enterprise"];

router.get("/coupons/validate", async (req, res) => {
  try {
    const code = (req.query.code as string)?.trim();
    const planKey = (req.query.planKey as string)?.trim() as PlanKey;

    if (!code) {
      res.status(400).json({ valid: false, error: "Code is required" });
      return;
    }
    if (!planKey || !VALID_PLANS.includes(planKey)) {
      res.status(400).json({ valid: false, error: "Invalid plan" });
      return;
    }

    const settings = await PricingSettings.findById("pricing");
    const plans = (settings?.plans ?? DEFAULT_PRICING_CONFIG) as any;
    const plan = plans[planKey];

    if (!plan?.coupon) {
      res.json({ valid: false, error: "No coupon available for this plan" });
      return;
    }

    const coupon = plan.coupon;
    if (coupon.code.toUpperCase() !== code.toUpperCase()) {
      res.json({ valid: false, error: "Invalid coupon code" });
      return;
    }

    const remaining = coupon.maxUses - (coupon.usedCount ?? 0);
    if (remaining <= 0) {
      res.json({ valid: false, error: "Coupon limit reached" });
      return;
    }

    res.json({
      valid: true,
      planKey,
      discountedPrice: coupon.discountedPrice,
      originalPrice: plan.price,
      remaining,
    });
  } catch (err) {
    (req as any).log?.error({ err }, "Coupon validate error");
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

export default router;
