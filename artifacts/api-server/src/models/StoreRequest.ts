import mongoose, { Schema, Document } from "mongoose";

export interface IStoreRequest extends Document {
  username: string;
  password: string;
  storeName: string;
  whatsapp: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  createdAt: Date;
}

const StoreRequestSchema = new Schema<IStoreRequest>(
  {
    username: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    storeName: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const StoreRequest = mongoose.model<IStoreRequest>("StoreRequest", StoreRequestSchema);
