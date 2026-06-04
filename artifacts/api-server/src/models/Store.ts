import mongoose, { Schema, Document } from "mongoose";

export interface IStore extends Document {
  ownerId?: string;
  name: string;
  address?: string;
  whatsappNumber?: string;
  openingTime?: string;
  openDays?: string;
  bannerImage?: string;
  description?: string;
  publicSlug: string;
  isLocked: boolean;
  createdAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    ownerId: { type: String },
    name: { type: String, required: true, trim: true },
    address: { type: String },
    whatsappNumber: { type: String },
    openingTime: { type: String },
    openDays: { type: String },
    bannerImage: { type: String },
    description: { type: String },
    publicSlug: { type: String, unique: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Store = mongoose.model<IStore>("Store", StoreSchema);
