import mongoose, { Schema, Document } from "mongoose";

export interface ILikeEvent extends Document {
  productId: string;
  type: "like" | "tryon";
  createdAt: Date;
}

const LikeEventSchema = new Schema<ILikeEvent>(
  {
    productId: { type: String, required: true, index: true },
    type: { type: String, enum: ["like", "tryon"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LikeEventSchema.index({ productId: 1, type: 1, createdAt: 1 });

export const LikeEvent = mongoose.model<ILikeEvent>("LikeEvent", LikeEventSchema);
