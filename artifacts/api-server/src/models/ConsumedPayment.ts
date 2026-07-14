import mongoose, { Schema, Document } from "mongoose";

/**
 * Idempotency log for every Razorpay payment that has been successfully
 * applied to an account (signup or renewal).
 *
 * The unique index on razorpay_payment_id is the authoritative guard against
 * replay attacks — the DB rejects any attempt to process the same payment_id
 * twice, regardless of which route, instance, or user submits it.
 *
 * Workflow:
 *  1. Insert a ConsumedPayment record AFTER signature + order-status verification.
 *  2. If the insert throws code 11000, the payment was already applied → reject.
 *  3. Proceed with the rest of the flow (user creation / plan update).
 *  4. If the downstream operation fails unexpectedly, delete the ConsumedPayment
 *     record so the user can retry (the payment was legitimate, just our DB had
 *     a transient error).
 */
export interface IConsumedPayment extends Document {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  type: "signup" | "renewal";
  /** MongoDB _id of the admin User document; empty string for new signups */
  adminId: string;
  consumedAt: Date;
}

const ConsumedPaymentSchema = new Schema<IConsumedPayment>({
  razorpay_payment_id: { type: String, required: true, unique: true, trim: true },
  razorpay_order_id:   { type: String, required: true, unique: true, trim: true },
  type:      { type: String, enum: ["signup", "renewal"], required: true },
  adminId:   { type: String, default: "" },
  consumedAt: { type: Date, default: Date.now },
});

export const ConsumedPayment = mongoose.model<IConsumedPayment>(
  "ConsumedPayment",
  ConsumedPaymentSchema
);
