import mongoose, { Schema, Document } from "mongoose";

export interface IStoreRequest extends Document {
  username: string;
  password: string;
  storeName: string;
  whatsapp: string;
  adminNumber: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  rewardCode?: string;
  createdAt: Date;
}

const StoreRequestSchema = new Schema<IStoreRequest>(
  {
    username: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    storeName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true },
    adminNumber: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: { type: String, required: true },
    rewardCode: { type: String },
  },
  { timestamps: true }
);

export const StoreRequest = mongoose.model<IStoreRequest>("StoreRequest", StoreRequestSchema);
