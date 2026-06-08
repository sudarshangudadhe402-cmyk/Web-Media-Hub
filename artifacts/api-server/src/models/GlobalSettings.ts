import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    globalLink: { type: String, default: null },
  },
  { timestamps: true }
);

export const GlobalSettings = mongoose.model("GlobalSettings", schema);
