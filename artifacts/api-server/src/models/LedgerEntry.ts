import mongoose, { Schema, Document } from "mongoose";

export interface ILedgerEntry extends Document {
  adminId: string;
  date: string | null;
  customerName: string;
  productCost: number | null;
  paymentStatus: "Paid" | "Pending";
  createdAt: Date;
  updatedAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    adminId: { type: String, required: true, index: true },
    date: { type: String, default: null },
    customerName: { type: String, default: "" },
    productCost: { type: Number, default: null },
    paymentStatus: { type: String, enum: ["Paid", "Pending"], default: "Pending" },
  },
  { timestamps: true }
);

export const LedgerEntry = mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);
