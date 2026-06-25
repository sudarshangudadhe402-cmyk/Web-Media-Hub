import { Router } from "express";
import { MarketingCampaign } from "../models/MarketingCampaign";
import { CustomerAccount } from "../models/CustomerAccount";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";

const router = Router();

async function getMyStore(userId: string) {
  return Store.findOne({ ownerId: userId });
}

router.get("/campaigns", requireAuth, async (req: AuthRequest, res) => {
  try {
    const store = await getMyStore(String(req.user!._id));
    if (!store) { res.json([]); return; }
    const storeId = String(store._id);
    const campaigns = await MarketingCampaign.find({ storeId }).sort({ createdAt: -1 });
    const results = await Promise.all(
      campaigns.map(async (c) => {
        const customerCount = await CustomerAccount.countDocuments({
          storeId,
          campaign: c.campaignSlug,
          source: c.source,
        });
        return {
          id: String(c._id),
          campaignName: c.campaignName,
          campaignSlug: c.campaignSlug,
          source: c.source,
          trackingLink: c.trackingLink,
          qrEnabled: c.qrEnabled,
          isActive: c.isActive,
          customerCount,
          createdAt: c.createdAt.toISOString(),
        };
      })
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns", requireAuth, async (req: AuthRequest, res) => {
  try {
    const store = await getMyStore(String(req.user!._id));
    if (!store) { res.status(400).json({ error: "Store not found" }); return; }
    const storeId = String(store._id);
    const { campaignName, source, trackingLink, qrEnabled } = req.body;
    if (!campaignName || !source || !trackingLink) {
      res.status(400).json({ error: "campaignName, source, and trackingLink are required" });
      return;
    }
    const campaignSlug = campaignName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    const campaign = await MarketingCampaign.create({
      storeId,
      campaignName,
      campaignSlug,
      source,
      trackingLink,
      qrEnabled: !!qrEnabled,
      isActive: true,
    });
    res.status(201).json({
      id: String(campaign._id),
      campaignName: campaign.campaignName,
      campaignSlug: campaign.campaignSlug,
      source: campaign.source,
      trackingLink: campaign.trackingLink,
      qrEnabled: campaign.qrEnabled,
      isActive: campaign.isActive,
      customerCount: 0,
      createdAt: campaign.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/campaigns/:id/deactivate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const store = await getMyStore(String(req.user!._id));
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    const campaign = await MarketingCampaign.findOneAndUpdate(
      { _id: req.params.id, storeId: String(store._id) },
      { isActive: false },
      { new: true }
    );
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/campaigns/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const store = await getMyStore(String(req.user!._id));
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    await MarketingCampaign.findOneAndDelete({ _id: req.params.id, storeId: String(store._id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
