import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReferralCode extends Document {
  owner_admin_id: Types.ObjectId;
  referral_code: string;
  commission_percentage: number;
  customer_discount_percentage: number;
  total_signups: number;
  total_paid_admins: number;
  total_revenue: number;
  upi_id: string;
  withdrawable_balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    owner_admin_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referral_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    commission_percentage: { type: Number, default: 0, min: 0, max: 100 },
    customer_discount_percentage: { type: Number, default: 0, min: 0, max: 100 },
    total_signups: { type: Number, default: 0 },
    total_paid_admins: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
    upi_id: { type: String, default: "", trim: true },
    withdrawable_balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const ReferralCode = mongoose.model<IReferralCode>("ReferralCode", ReferralCodeSchema);
