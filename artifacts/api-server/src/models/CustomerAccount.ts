import mongoose, { Schema, Document } from "mongoose";

export interface ICustomerAccount extends Document {
  storeId: string;
  mobileNumber: string;
  password: string;
  createdAt: Date;
}

const CustomerAccountSchema = new Schema<ICustomerAccount>(
  {
    storeId: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

CustomerAccountSchema.index({ storeId: 1, mobileNumber: 1 }, { unique: true });

export const CustomerAccount = mongoose.model<ICustomerAccount>("CustomerAccount", CustomerAccountSchema);
