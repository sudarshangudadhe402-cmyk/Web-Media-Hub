import mongoose, { Schema, Document } from "mongoose";

export interface IMarketingCampaign extends Document {
  storeId: string;
  campaignName: string;
  campaignSlug: string;
  source: string;
  trackingLink: string;
  qrEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
}

const MarketingCampaignSchema = new Schema<IMarketingCampaign>(
  {
    storeId: { type: String, required: true },
    campaignName: { type: String, required: true, trim: true },
    campaignSlug: { type: String, required: true },
    source: { type: String, required: true },
    trackingLink: { type: String, required: true },
    qrEnabled: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MarketingCampaignSchema.index({ storeId: 1, createdAt: -1 });

export const MarketingCampaign = mongoose.model<IMarketingCampaign>(
  "MarketingCampaign",
  MarketingCampaignSchema
);
