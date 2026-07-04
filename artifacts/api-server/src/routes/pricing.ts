import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/auth";
import { DynamicPricing } from "../models/DynamicPricing";
import { User } from "../models/User";
import { findPartnerCoupon } from "../services/partnerCouponService";

const router = Router();

async function getOrCreate() {
  // Use lean() first to avoid Mongoose validation error when old docs have storeTypes as strings
  const raw = await DynamicPricing.findById("pricing-v2").lean() as any;
  if (!raw) {
    return await DynamicPricing.create({ _id: "pricing-v2", plans: [], categories: [], storeTypes: [] });
  }

  // Migrate storeTypes from legacy string[] to { name, category }[] format
  const types: any[] = raw.storeTypes ?? [];
  if (types.some((s: any) => typeof s === "string")) {
    const migrated = types.map((s: any) =>
      typeof s === "string" ? { name: s, category: "" } : s
    );
    await DynamicPricing.updateOne({ _id: "pricing-v2" }, { $set: { storeTypes: migrated } });
  }

  return (await DynamicPricing.findById("pricing-v2"))!;
}

// GET /api/pricing — list plans + categories + storeTypes
router.get("/pricing", async (req, res) => {
  try {
    const doc = await getOrCreate();
    const category = (req.query.category as string)?.trim();
    const storeType = (req.query.storeType as string)?.trim();
    const search = (req.query.search as string)?.trim().toLowerCase();

    let plans = doc.plans as any[];

    if (category && category !== "all") {
      plans = plans.filter((p: any) => p.categories?.includes(category));
    }
    if (storeType && storeType !== "all") {
      plans = plans.filter((p: any) => p.storeTypes?.includes(storeType));
    }
    if (search) {
      plans = plans.filter(
        (p: any) =>
          p.name.toLowerCase().includes(search) ||
          p.price.toLowerCase().includes(search) ||
          String(p.durationDays ?? "").includes(search) ||
          (p.storeTypes ?? []).some((s: string) => s.toLowerCase().includes(search))
      );
    }

    // Build name→category lookup from pricing doc
    const typeToCategory: Record<string, string> = {};
    for (const st of doc.storeTypes as any[]) {
      if (st.name) typeToCategory[st.name] = st.category ?? "";
    }
    // Count admins per store type, keyed "name::category" to avoid cross-category collisions
    const adminDocs = await User.find({ role: "admin", storeType: { $ne: "" } }).select("storeType").lean();
    const storeTypeCounts: Record<string, number> = {};
    for (const a of adminDocs) {
      const t = (a as any).storeType as string;
      if (!t) continue;
      const cat = typeToCategory[t] ?? "";
      const key = cat ? `${t}::${cat}` : t;
      storeTypeCounts[key] = (storeTypeCounts[key] ?? 0) + 1;
    }

    res.json({ plans: plans.map(planToJson), categories: doc.categories, storeTypes: doc.storeTypes, storeTypeCounts });
  } catch (err) {
    (req as any).log?.error({ err }, "Get pricing error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/pricing/plans — create plan
router.post("/pricing/plans", requireSuperAdmin, async (req, res) => {
  try {
    const { badgeText, name, price, durationDays, features, coupons, categories, storeTypes } = req.body;
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
      categories: Array.isArray(categories) ? categories : [],
      storeTypes: Array.isArray(storeTypes) ? storeTypes : [],
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

    const { badgeText, name, price, durationDays, features, coupons, categories, storeTypes } = req.body;
    if (badgeText !== undefined) plan.badgeText = badgeText;
    if (name !== undefined) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (durationDays !== undefined) plan.durationDays = durationDays;
    if (features !== undefined) plan.features = features;
    if (coupons !== undefined) plan.coupons = coupons;
    if (categories !== undefined) plan.categories = categories;
    if (storeTypes !== undefined) plan.storeTypes = storeTypes;

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

// POST /api/pricing/categories — add category
router.post("/pricing/categories", requireSuperAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Category name required" }); return; }
    const doc = await getOrCreate();
    const cat = name.trim();
    if (!(doc.categories as string[]).includes(cat)) {
      (doc.categories as string[]).push(cat);
      await doc.save();
    }
    res.json({ categories: doc.categories });
  } catch (err) {
    (req as any).log?.error({ err }, "Add category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/pricing/categories/:name — rename category
router.put("/pricing/categories/:name", requireSuperAdmin, async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const { name: newName } = req.body;
    if (!newName?.trim()) { res.status(400).json({ error: "New category name required" }); return; }
    const doc = await getOrCreate();
    const idx = (doc.categories as string[]).indexOf(oldName);
    if (idx === -1) { res.status(404).json({ error: "Category not found" }); return; }
    const trimmed = newName.trim();
    (doc.categories as string[])[idx] = trimmed;
    // Update storeTypes that belong to this category
    for (const st of doc.storeTypes as any[]) {
      if (st.category === oldName) st.category = trimmed;
    }
    // Update plans
    for (const plan of doc.plans as any[]) {
      plan.categories = (plan.categories as string[]).map((c: string) => c === oldName ? trimmed : c);
    }
    await doc.save();
    res.json({ categories: doc.categories });
  } catch (err) {
    (req as any).log?.error({ err }, "Rename category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/pricing/categories/:name — remove category
router.delete("/pricing/categories/:name", requireSuperAdmin, async (req, res) => {
  try {
    const cat = decodeURIComponent(req.params.name);
    const doc = await getOrCreate();
    (doc as any).categories = (doc.categories as string[]).filter((c) => c !== cat);
    // Remove store types belonging to this category
    (doc as any).storeTypes = (doc.storeTypes as any[]).filter((s: any) => s.category !== cat);
    for (const plan of doc.plans as any[]) {
      plan.categories = (plan.categories as string[]).filter((c: string) => c !== cat);
    }
    await doc.save();
    res.json({ categories: doc.categories });
  } catch (err) {
    (req as any).log?.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/pricing/store-types — add store type (requires name + category)
router.post("/pricing/store-types", requireSuperAdmin, async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Store type name required" }); return; }
    if (!category?.trim()) { res.status(400).json({ error: "Category is required for store type" }); return; }
    const doc = await getOrCreate();
    const stName = name.trim();
    const stCat = category.trim();
    if (!(doc.categories as string[]).includes(stCat)) {
      res.status(400).json({ error: "Category does not exist" }); return;
    }
    const exists = (doc.storeTypes as any[]).some((s: any) => s.name === stName && s.category === stCat);
    if (!exists) {
      (doc.storeTypes as any[]).push({ name: stName, category: stCat });
      await doc.save();
    }
    res.json({ storeTypes: doc.storeTypes });
  } catch (err) {
    (req as any).log?.error({ err }, "Add store type error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/pricing/store-types/:name — edit store type
router.put("/pricing/store-types/:name", requireSuperAdmin, async (req, res) => {
  try {
    const oldName = decodeURIComponent(req.params.name);
    const { name: newName, category } = req.body;
    const doc = await getOrCreate();
    const st = (doc.storeTypes as any[]).find((s: any) => s.name === oldName);
    if (!st) { res.status(404).json({ error: "Store type not found" }); return; }
    if (newName?.trim()) st.name = newName.trim();
    if (category?.trim()) {
      if (!(doc.categories as string[]).includes(category.trim())) {
        res.status(400).json({ error: "Category does not exist" }); return;
      }
      st.category = category.trim();
    }
    await doc.save();
    res.json({ storeTypes: doc.storeTypes });
  } catch (err) {
    (req as any).log?.error({ err }, "Edit store type error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/pricing/store-types/:name — remove store type
router.delete("/pricing/store-types/:name", requireSuperAdmin, async (req, res) => {
  try {
    const st = decodeURIComponent(req.params.name);
    const doc = await getOrCreate();
    (doc as any).storeTypes = (doc.storeTypes as any[]).filter((s: any) => s.name !== st);
    await doc.save();
    res.json({ storeTypes: doc.storeTypes });
  } catch (err) {
    (req as any).log?.error({ err }, "Delete store type error");
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
    categories: p.categories ?? [],
    storeTypes: p.storeTypes ?? [],
    createdAt: p.createdAt,
  };
}

export default router;
