import mongoose, { Schema, Document } from "mongoose";

export interface ILoyaltyCard extends Document {
  storeId: string;
  customerName: string;
  mobileNumber: string;
  password: string;
  status: "requested" | "approved" | "rejected";
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  cardGeneration: number;
  refreshedAt?: Date;
}

const LoyaltyCardSchema = new Schema<ILoyaltyCard>(
  {
    storeId: { type: String, required: true },
    customerName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    cardGeneration: { type: Number, default: 1 },
    refreshedAt: { type: Date },
  },
  { timestamps: true }
);

export const LoyaltyCard = mongoose.model<ILoyaltyCard>("LoyaltyCard", LoyaltyCardSchema);
