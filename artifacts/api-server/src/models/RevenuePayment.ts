import mongoose, { Schema, Document } from "mongoose";

export interface IRevenuePayment extends Document {
  adminId: string;
  type: "signup" | "renewal";
  amount: number;
  planName: string;
  createdAt: Date;
}

const RevenuePaymentSchema = new Schema<IRevenuePayment>(
  {
    adminId: { type: String, required: true, index: true },
    type: { type: String, enum: ["signup", "renewal"], required: true },
    amount: { type: Number, required: true },
    planName: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RevenuePaymentSchema.index({ type: 1, createdAt: 1 });

export const RevenuePayment = mongoose.model<IRevenuePayment>("RevenuePayment", RevenuePaymentSchema);
