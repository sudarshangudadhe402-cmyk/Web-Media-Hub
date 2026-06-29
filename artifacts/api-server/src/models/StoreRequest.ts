import mongoose, { Schema, Document } from "mongoose";

export interface IStoreRequest extends Document {
  email: string;
  password: string;
  storeName: string;
  whatsapp: string;
  plan?: string;
  planName?: string;
  planPrice?: string;
  planPeriod?: string;
  planBadge?: string;
  planColor?: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  rewardCode?: string;
  referred_by_admin_username?: string;
  createdAt: Date;
}

const StoreRequestSchema = new Schema<IStoreRequest>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    storeName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true },
    plan: { type: String },
    planName: { type: String, default: "" },
    planPrice: { type: String, default: "" },
    planPeriod: { type: String, default: "" },
    planBadge: { type: String, default: "" },
    planColor: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: { type: String, required: true },
    rewardCode: { type: String },
    referred_by_admin_username: { type: String, default: "" },
  },
  { timestamps: true }
);

export const StoreRequest = mongoose.model<IStoreRequest>("StoreRequest", StoreRequestSchema);
