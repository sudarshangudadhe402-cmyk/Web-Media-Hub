import mongoose from "mongoose";

const BuiltinSourceSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const BuiltinSourceSetting = mongoose.model("BuiltinSourceSetting", BuiltinSourceSettingSchema);
