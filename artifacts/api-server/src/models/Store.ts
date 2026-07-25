import mongoose, { Schema, Document } from "mongoose";

export interface IStoreAddressDetails {
  houseNumber?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  stateDistrict?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

export interface IStore extends Document {
  ownerId?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  addressDetails?: IStoreAddressDetails;
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
    latitude: { type: Number },
    longitude: { type: Number },
    addressDetails: {
      houseNumber: { type: String, trim: true },
      road: { type: String, trim: true },
      neighbourhood: { type: String, trim: true },
      suburb: { type: String, trim: true },
      city: { type: String, trim: true },
      town: { type: String, trim: true },
      village: { type: String, trim: true },
      district: { type: String, trim: true },
      stateDistrict: { type: String, trim: true },
      state: { type: String, trim: true },
      postcode: { type: String, trim: true },
      country: { type: String, trim: true },
      countryCode: { type: String, trim: true, lowercase: true },
    },
    whatsappNumber: { type: String },
    openingTime: { type: String },
    openDays: { type: String },
    bannerImage: { type: String },
    description: { type: String },
    publicSlug: { type: String, unique: true, required: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for store discovery queries
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ isLocked: 1 });
StoreSchema.index({ latitude: 1, longitude: 1 });
StoreSchema.index({ name: "text", address: "text" });

export const Store = mongoose.model<IStore>("Store", StoreSchema);
