import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  productId: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  selectedSize: string;
  ignored: boolean;
  seenByAdmin: boolean;
  tryOnImage?: string;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    selectedSize: { type: String, required: true },
    ignored: { type: Boolean, default: false },
    seenByAdmin: { type: Boolean, default: false },
    tryOnImage: { type: String },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
