import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ICustomerAccount extends Document {
  storeId: string;
  mobileNumber: string;
  password: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
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

CustomerAccountSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password.startsWith("$2")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

CustomerAccountSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const CustomerAccount = mongoose.model<ICustomerAccount>("CustomerAccount", CustomerAccountSchema);
