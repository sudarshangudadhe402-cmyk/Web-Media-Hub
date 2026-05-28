import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  type: "booking" | "like" | "store_request";
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ["booking", "like", "store_request"],
      required: true,
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedId: { type: String },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
