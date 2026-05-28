import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  images: string[];
  discountPrice: number;
  actualPrice: number;
  functionCategory?: string;
  productType: "Top" | "Bottom" | "Full Outfit" | "Functional";
  sizes: string[];
  likeCount: number;
  storeId?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    images: [{ type: String }],
    discountPrice: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    functionCategory: { type: String },
    productType: {
      type: String,
      enum: ["Top", "Bottom", "Full Outfit", "Functional"],
      required: true,
    },
    sizes: [{ type: String }],
    likeCount: { type: Number, default: 0 },
    storeId: { type: String },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
