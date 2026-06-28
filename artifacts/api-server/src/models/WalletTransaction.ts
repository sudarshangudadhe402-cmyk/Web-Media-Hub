import mongoose, { Schema, Document } from "mongoose";

export type WalletTxType =
  | "credit"
  | "debit"
  | "withdrawal_request"
  | "withdrawal_success"
  | "withdrawal_failed"
  | "adjustment";

export type WalletTxStatus = "completed" | "pending" | "failed";

export interface IWalletTransaction extends Document {
  transaction_id: string;
  wallet_id: mongoose.Types.ObjectId;
  partner_type: string;
  partner_code: string;
  amount: number;
  type: WalletTxType;
  status: WalletTxStatus;
  description: string;
  reference_id?: string;
  created_at: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    transaction_id: { type: String, required: true, unique: true },
    wallet_id: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    partner_type: { type: String, required: true },
    partner_code: { type: String, required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["credit", "debit", "withdrawal_request", "withdrawal_success", "withdrawal_failed", "adjustment"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },
    description: { type: String, default: "" },
    reference_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

WalletTransactionSchema.index({ wallet_id: 1, created_at: -1 });
WalletTransactionSchema.index({ partner_code: 1, partner_type: 1, created_at: -1 });
WalletTransactionSchema.index({ transaction_id: 1 }, { unique: true });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  "WalletTransaction",
  WalletTransactionSchema
);
