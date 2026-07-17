import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  conversationId: string;
  storeId: string;
  text: string;
  senderRole: "admin" | "customer";
  senderId: string;
  deletedForAdmin: boolean;
  deletedForCustomer: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    storeId: { type: String, required: true, index: true },
    text: { type: String, required: true, maxlength: 1000 },
    senderRole: { type: String, enum: ["admin", "customer"], required: true },
    senderId: { type: String, required: true },
    deletedForAdmin: { type: Boolean, default: false },
    deletedForCustomer: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ conversationId: 1, senderRole: 1, readAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
