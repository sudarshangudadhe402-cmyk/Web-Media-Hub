import mongoose, { Schema, Document } from "mongoose";

export interface IWithdrawal extends Document {
  requestId: string;
  partnerType: "influencer" | "ambassador" | "referral";
  partnerCode: string;
  partnerEmail: string;
  amount: number;
  upiId: string;
  status: "pending" | "processing" | "completed" | "failed";
  completedAt?: Date;
  transactionId?: string;
  retryCount: number;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    requestId: { type: String, required: true, unique: true },
    partnerType: { type: String, enum: ["influencer", "ambassador", "referral"], required: true },
    partnerCode: { type: String, required: true, trim: true, uppercase: true },
    partnerEmail: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true, min: 500, max: 25000 },
    upiId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    completedAt: { type: Date, default: null },
    transactionId: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

WithdrawalSchema.index({ partnerCode: 1, partnerType: 1, createdAt: -1 });
WithdrawalSchema.index({ status: 1, partnerCode: 1 });

export const Withdrawal = mongoose.model<IWithdrawal>("Withdrawal", WithdrawalSchema);
