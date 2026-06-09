import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  storeId: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    storeId: { type: String, required: true },
  },
  { timestamps: true }
);

CategorySchema.index({ storeId: 1, name: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
