import mongoose, { Schema, Document } from "mongoose";

export interface IInfluencer extends Document {
  name: string;
  coupon_code: string;
  commission_percentage: number;
  customer_discount_percentage: number;
  total_signups: number;
  total_paid_admins: number;
  total_revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

const InfluencerSchema = new Schema<IInfluencer>(
  {
    name: { type: String, required: true, trim: true },
    coupon_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    commission_percentage: { type: Number, default: 0, min: 0, max: 100 },
    customer_discount_percentage: { type: Number, default: 0, min: 0, max: 100 },
    total_signups: { type: Number, default: 0 },
    total_paid_admins: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Influencer = mongoose.model<IInfluencer>("Influencer", InfluencerSchema);
