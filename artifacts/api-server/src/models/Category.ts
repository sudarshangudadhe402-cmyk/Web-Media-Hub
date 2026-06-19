import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  storeId: string;
  coverImage?: string;
  description?: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    storeId: { type: String, required: true },
    coverImage: { type: String, default: null },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

CategorySchema.index({ storeId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
