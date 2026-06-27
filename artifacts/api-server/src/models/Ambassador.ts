import mongoose, { Schema, Document } from "mongoose";

export interface IAmbassador extends Document {
  name: string;
  city: string;
  referral_code: string;
  commission_percentage: number;
  customer_discount_percentage: number;
  total_signups: number;
  total_paid_admins: number;
  total_revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

const AmbassadorSchema = new Schema<IAmbassador>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, default: "", trim: true },
    referral_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    commission_percentage: { type: Number, default: 0, min: 0, max: 100 },
    customer_discount_percentage: { type: Number, default: 0, min: 0, max: 100 },
    total_signups: { type: Number, default: 0 },
    total_paid_admins: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Ambassador = mongoose.model<IAmbassador>("Ambassador", AmbassadorSchema);
