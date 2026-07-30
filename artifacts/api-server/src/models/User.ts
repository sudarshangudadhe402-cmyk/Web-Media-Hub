import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ActiveSession {
  sessionId: string;
  loginAt: Date;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  adminNumber: string;
  role: "super_admin" | "admin";
  isActive: boolean;
  activeSessions: ActiveSession[];
  planKey: string;
  multiDeviceAllowed: boolean;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planBadge: string;
  planColor: string;
  subscriptionStartDate: Date | null;
  subscriptionEndDate: Date | null;
  signup_source: string;
  source_id: string;
  coupon_code: string;
  utm_source: string;
  source_confirmed: boolean;
  storeType: string;
  referred_by_admin_username: string; // referral link se aane wale ka source admin username
  storeState: string;  // State jahan store registered hai (e.g. "Maharashtra")
  storeCity: string;   // City jahan store registered hai (e.g. "Pune") — City model se linked
  // Razorpay autopay
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
  autopayStatus: "none" | "pending" | "active" | "cancelled";
  originalPlanPrice: string;
  autopaySetupToken: string;
  autopaySetupTokenExpiry: Date | null;
  lastWebhookPaymentId: string; // idempotency key for subscription.charged events
  lastVerifiedPaymentId: string; // replay-protection: last razorpay_payment_id consumed by renewal-verify
  failedPaymentCount: number; // consecutive autopay failures; autopay is cancelled after 2
  expiredEmailSent: boolean; // true once the deactivation email has been sent; reset on renewal
  uploadViolationCount: number; // invalid/malicious upload attempts; account blocked at 3
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  needsRehash(): boolean;
}

const BCRYPT_MIN_ROUNDS = 12;

function getBcryptRounds(hash: string): number {
  const m = hash.match(/^\$2[aby]?\$(\d+)\$/);
  return m ? parseInt(m[1], 10) : 0;
}

const ActiveSessionSchema = new Schema<ActiveSession>(
  {
    sessionId: { type: String, required: true },
    loginAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: "", trim: true },
    password: { type: String, required: true },
    adminNumber: { type: String, default: "" },
    role: { type: String, enum: ["super_admin", "admin"], default: "admin" },
    isActive: { type: Boolean, default: true },
    activeSessions: { type: [ActiveSessionSchema], default: [] },
    planKey: { type: String, default: "" },
    multiDeviceAllowed: { type: Boolean, default: false },
    planName: { type: String, default: "" },
    planPrice: { type: String, default: "" },
    planPeriod: { type: String, default: "" },
    planBadge: { type: String, default: "" },
    planColor: { type: String, default: "" },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
    signup_source: { type: String, default: "ORGANIC" },
    source_id: { type: String, default: "" },
    coupon_code: { type: String, default: "" },
    utm_source: { type: String, default: "" },
    source_confirmed: { type: Boolean, default: false },
    storeType: { type: String, default: "" },
    referred_by_admin_username: { type: String, default: "" },
    storeState: { type: String, default: "" },
    storeCity: { type: String, default: "" },
    // Razorpay autopay
    razorpaySubscriptionId: { type: String, default: "" },
    razorpayPlanId: { type: String, default: "" },
    autopayStatus: { type: String, enum: ["none", "pending", "active", "cancelled"], default: "none" },
    originalPlanPrice: { type: String, default: "" },
    autopaySetupToken: { type: String, default: "" },
    autopaySetupTokenExpiry: { type: Date, default: null },
    lastWebhookPaymentId: { type: String, default: "" },
    lastVerifiedPaymentId: { type: String, default: "" },
    failedPaymentCount: { type: Number, default: 0 },
    expiredEmailSent: { type: Boolean, default: false },
    uploadViolationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password.startsWith("$2")) return;
  const salt = await bcrypt.genSalt(BCRYPT_MIN_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.needsRehash = function (): boolean {
  return getBcryptRounds(this.password) < BCRYPT_MIN_ROUNDS;
};

export const User = mongoose.model<IUser>("User", UserSchema);
