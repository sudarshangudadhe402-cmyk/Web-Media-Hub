import mongoose, { Schema } from "mongoose";

const PricingPlanSchema = new Schema(
  {
    displayName: { type: String, required: true },
    displayBadge: { type: String, required: true },
    price: { type: String, required: true },
    displayPeriod: { type: String, required: true },
    shortPeriod: { type: String, required: true },
    tagline: { type: String, required: true },
    features: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    savingsNote: { type: String, default: null },
    subscriptionDays: { type: Number, default: null },
  },
  { _id: false }
);

const schema = new Schema(
  {
    _id: { type: String, default: "pricing" },
    plans: {
      demo: { type: PricingPlanSchema, required: true },
      premium: { type: PricingPlanSchema, required: true },
      lifetime: { type: PricingPlanSchema, required: true },
      enterprise: { type: PricingPlanSchema, required: true },
    },
  },
  { timestamps: true }
);

export const PricingSettings = mongoose.model("PricingSettings", schema);
