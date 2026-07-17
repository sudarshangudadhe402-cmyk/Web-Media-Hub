import mongoose, { Schema, Document } from "mongoose";

export interface IChatConversation extends Document {
  storeId: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: Date;
  adminUnread: number;
  customerUnread: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    storeId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    adminUnread: { type: Number, default: 0 },
    customerUnread: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatConversationSchema.index({ storeId: 1, customerId: 1 }, { unique: true });
ChatConversationSchema.index({ storeId: 1, lastMessageAt: -1 });

export const ChatConversation = mongoose.model<IChatConversation>(
  "ChatConversation",
  ChatConversationSchema
);
