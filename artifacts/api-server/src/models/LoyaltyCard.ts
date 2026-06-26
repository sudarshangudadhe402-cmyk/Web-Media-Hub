import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface ILoyaltyCard extends Document {
  storeId: string;
  customerName: string;
  mobileNumber: string;
  password: string;
  status: "requested" | "approved" | "rejected";
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  cardGeneration: number;
  refreshedAt?: Date;
  seenByAdmin?: boolean;
  comparePassword(candidate: string): Promise<boolean>;
  needsRehash(): boolean;
}

const BCRYPT_MIN_ROUNDS = 12;

function getBcryptRounds(hash: string): number {
  const m = hash.match(/^\$2[aby]?\$(\d+)\$/);
  return m ? parseInt(m[1], 10) : 0;
}

const LoyaltyCardSchema = new Schema<ILoyaltyCard>(
  {
    storeId: { type: String, required: true },
    customerName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true },
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    cardGeneration: { type: Number, default: 1 },
    refreshedAt: { type: Date },
    seenByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LoyaltyCardSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (this.password.startsWith("$2")) return;
  const salt = await bcrypt.genSalt(BCRYPT_MIN_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

LoyaltyCardSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

LoyaltyCardSchema.methods.needsRehash = function (): boolean {
  return getBcryptRounds(this.password) < BCRYPT_MIN_ROUNDS;
};

export const LoyaltyCard = mongoose.model<ILoyaltyCard>("LoyaltyCard", LoyaltyCardSchema);
