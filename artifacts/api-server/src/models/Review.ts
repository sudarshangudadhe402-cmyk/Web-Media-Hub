import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  productId: string;
  storeId: string;
  customerId: string;
  customerName: string;
  text: string;
  likes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: String, required: true },
    storeId: { type: String, required: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: { type: [String], default: [] },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, storeId: 1 });
ReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
