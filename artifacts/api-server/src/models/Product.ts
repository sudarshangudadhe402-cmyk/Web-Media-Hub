import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  brandName?: string;
  description?: string;
  images: string[];
  modelUrl?: string;
  discountPrice: number;
  actualPrice: number;
  functionCategory?: string;
  productType: "Top" | "Bottom" | "Full Outfit" | "Functional";
  sizes: string[];
  age?: string;
  gender?: string;
  stock: number;
  colours: string[];
  likeCount: number;
  tryOnLikeCount: number;
  averageRating: number;
  storeId?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true },
    description: { type: String },
    images: [{ type: String }],
    modelUrl: { type: String },
    discountPrice: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    functionCategory: { type: String },
    productType: {
      type: String,
      enum: ["Top", "Bottom", "Full Outfit", "Functional"],
    },
    sizes: [{ type: String }],
    age: { type: String },
    gender: { type: String },
    stock: { type: Number, default: 0 },
    colours: [{ type: String }],
    likeCount: { type: Number, default: 0 },
    tryOnLikeCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    storeId: { type: String },
  },
  { timestamps: true }
);

// Index for store-scoped product queries (admin list, booking ownership checks)
ProductSchema.index({ storeId: 1, createdAt: -1 });
// Compound index for like/tryOn sorted queries used in discovery
ProductSchema.index({ storeId: 1, likeCount: -1 });
ProductSchema.index({ storeId: 1, tryOnLikeCount: -1 });

export const Product = mongoose.model<IProduct>("Product", ProductSchema);
