import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  plainPassword: string;
  adminNumber: string;
  role: "super_admin" | "admin";
  isActive: boolean;
  sessionId: string;
  multiDeviceAllowed: boolean;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
  planColor: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", trim: true },
    password: { type: String, required: true },
    plainPassword: { type: String, default: "" },
    adminNumber: { type: String, default: "" },
    role: { type: String, enum: ["super_admin", "admin"], default: "admin" },
    isActive: { type: Boolean, default: true },
    sessionId: { type: String, default: "" },
    multiDeviceAllowed: { type: Boolean, default: false },
    planName: { type: String, default: "" },
    planPrice: { type: String, default: "" },
    planPeriod: { type: String, default: "" },
    planBadge: { type: String, default: "" },
    planColor: { type: String, default: "" },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
