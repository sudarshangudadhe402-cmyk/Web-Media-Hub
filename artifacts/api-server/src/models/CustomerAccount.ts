import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ICustomerAccount extends Document {
  storeId: string;
  name: string;
  email: string;
  password: string;
  source?: string;
  campaign?: string;
  cart: string[];
  /**
   * Permanently true once the account has any meaningful data:
   * cart items added, review posted, etc.
   * Never reset to false — used by the cleanup job to apply the
   * 90-day inactivity window instead of the 45-day empty-account window.
   */
  hasActivity: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  needsRehash(): boolean;
}

const BCRYPT_MIN_ROUNDS = 12;

function getBcryptRounds(hash: string): number {
  const m = hash.match(/^\$2[aby]?\$(\d+)\$/);
  return m ? parseInt(m[1], 10) : 0;
}

const CustomerAccountSchema = new Schema<ICustomerAccount>(
  {
    storeId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    source: { type: String },
    campaign: { type: String },
    cart: { type: [String], default: [] },
    hasActivity: { type: Boolean, default: false, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

CustomerAccountSchema.index({ storeId: 1, email: 1 }, { unique: true });

CustomerAccountSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password.startsWith("$2")) return;
  const salt = await bcrypt.genSalt(BCRYPT_MIN_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

CustomerAccountSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

CustomerAccountSchema.methods.needsRehash = function (): boolean {
  return getBcryptRounds(this.password) < BCRYPT_MIN_ROUNDS;
};

export const CustomerAccount = mongoose.model<ICustomerAccount>("CustomerAccount", CustomerAccountSchema);
