import mongoose, { Schema, Document } from "mongoose";

export interface IAdminLegalAcceptance extends Document {
  admin_id: string;
  admin_name: string;
  terms_accepted: boolean;
  privacy_accepted: boolean;
  refund_accepted: boolean;
  disclaimer_accepted: boolean;
  final_acceptance: boolean;
  accepted_date: string;
  accepted_time: string;
  accepted_timestamp: Date;
  device_type: string;
  browser_name: string;
  ip_address: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminLegalAcceptanceSchema = new Schema<IAdminLegalAcceptance>(
  {
    admin_id: { type: String, required: true, unique: true },
    admin_name: { type: String, required: true },
    terms_accepted: { type: Boolean, default: false },
    privacy_accepted: { type: Boolean, default: false },
    refund_accepted: { type: Boolean, default: false },
    disclaimer_accepted: { type: Boolean, default: false },
    final_acceptance: { type: Boolean, default: false },
    accepted_date: { type: String, default: "" },
    accepted_time: { type: String, default: "" },
    accepted_timestamp: { type: Date },
    device_type: { type: String, default: "" },
    browser_name: { type: String, default: "" },
    ip_address: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AdminLegalAcceptance = mongoose.model<IAdminLegalAcceptance>(
  "AdminLegalAcceptance",
  AdminLegalAcceptanceSchema
);
