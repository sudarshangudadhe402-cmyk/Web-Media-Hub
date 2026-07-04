import mongoose, { Schema } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true },
    discountedPrice: { type: String, required: true },
    maxUses: { type: Number, required: true },
    usedCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const DynamicPlanSchema = new Schema(
  {
    badgeText: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: String, required: true },
    durationDays: { type: Number, default: null },
    features: { type: [String], default: [] },
    coupons: { type: [CouponSchema], default: [] },
    categories: { type: [String], default: [] },
    storeTypes: { type: [String], default: [] },
  },
  { timestamps: true }
);

const StoreTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const DynamicPricingSchema = new Schema(
  {
    _id: { type: String, default: "pricing-v2" },
    plans: { type: [DynamicPlanSchema], default: [] },
    categories: { type: [String], default: [] },
    storeTypes: { type: [StoreTypeSchema], default: [] },
  },
  { timestamps: true }
);

export const DynamicPricing = mongoose.model("DynamicPricing", DynamicPricingSchema);
