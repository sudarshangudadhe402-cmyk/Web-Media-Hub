import mongoose, { Schema, Document } from "mongoose";

export interface IWallet extends Document {
  partnerType: "influencer" | "ambassador" | "referral";
  partnerCode: string;
  wallet_balance: number;
  lifetime_earnings: number;
  pending_withdrawal: number;
  total_withdrawn: number;
  last_updated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    partnerType: {
      type: String,
      enum: ["influencer", "ambassador", "referral"],
      required: true,
    },
    partnerCode: { type: String, required: true, trim: true, uppercase: true },
    wallet_balance: { type: Number, default: 0, min: 0 },
    lifetime_earnings: { type: Number, default: 0, min: 0 },
    pending_withdrawal: { type: Number, default: 0, min: 0 },
    total_withdrawn: { type: Number, default: 0, min: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

WalletSchema.index({ partnerType: 1, partnerCode: 1 }, { unique: true });

export const Wallet = mongoose.model<IWallet>("Wallet", WalletSchema);
