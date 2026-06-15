import mongoose, { Schema, Document } from "mongoose";

export interface IStoreVisitor extends Document {
  storeId: string;
  visitorIp: string;
  visitedAt: Date;
}

const StoreVisitorSchema = new Schema<IStoreVisitor>({
  storeId: { type: String, required: true, index: true },
  visitorIp: { type: String, required: true },
  visitedAt: { type: Date, required: true, default: Date.now, index: true },
});

StoreVisitorSchema.index({ storeId: 1, visitorIp: 1, visitedAt: 1 });

export const StoreVisitor = mongoose.model<IStoreVisitor>("StoreVisitor", StoreVisitorSchema);
