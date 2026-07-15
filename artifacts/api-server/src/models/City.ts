import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

schema.index({ state: 1, name: 1 }, { unique: true });

export const City = mongoose.model("City", schema);
