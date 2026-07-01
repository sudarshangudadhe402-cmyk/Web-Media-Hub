import mongoose from "mongoose";

const BuiltinSourceSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  label_override: { type: String, default: "" },
  color_override: { type: String, default: "" },
}, { timestamps: true });

export const BuiltinSourceSetting = mongoose.model("BuiltinSourceSetting", BuiltinSourceSettingSchema);
