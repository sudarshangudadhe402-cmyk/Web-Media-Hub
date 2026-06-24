import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: "#6b7280" },
  },
  { timestamps: true }
);

export const MarketingSourceConfig = mongoose.model("MarketingSourceConfig", schema);
