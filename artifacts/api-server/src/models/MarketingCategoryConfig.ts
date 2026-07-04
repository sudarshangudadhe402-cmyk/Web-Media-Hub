import mongoose from "mongoose";

const storeTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "" },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    _id: { type: String },
    categories: { type: [String], default: [] },
    storeTypes: { type: [storeTypeSchema], default: [] },
  },
  { timestamps: true }
);

export const MarketingCategoryConfig = mongoose.model("MarketingCategoryConfig", schema);
