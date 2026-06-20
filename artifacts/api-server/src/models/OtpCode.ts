import mongoose, { Document, Schema } from "mongoose";

export interface IOtpCode extends Document {
  email: string;
  storeId: string;
  code: string;
  purpose: "signup" | "signin" | "admin-creation" | "admin-forgot-password";
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const OtpCodeSchema = new Schema<IOtpCode>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    storeId: { type: String, default: "" },
    code: { type: String, required: true },
    purpose: { type: String, enum: ["signup", "signin", "admin-creation", "admin-forgot-password"], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode = mongoose.model<IOtpCode>("OtpCode", OtpCodeSchema);
