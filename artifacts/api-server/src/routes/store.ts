import { Router } from "express";
import { Store } from "../models/Store";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 7);
}

function formatStore(s: InstanceType<typeof Store>) {
  return {
    id: String(s._id),
    name: s.name,
    address: s.address ?? null,
    whatsappNumber: s.whatsappNumber ?? null,
    openingTime: s.openingTime ?? null,
    openDays: s.openDays ?? null,
    bannerImage: s.bannerImage ?? null,
    description: s.description ?? null,
    publicSlug: s.publicSlug ?? null,
    isLocked: s.isLocked,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/store", requireAuth, async (req, res) => {
  try {
    const store = await Store.findOne();
    if (!store) {
      res.status(404).json({ error: "Store not configured yet" });
      return;
    }
    res.json(formatStore(store));
  } catch (err) {
    req.log.error({ err }, "Get store error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/store", requireAuth, async (req, res) => {
  try {
    const { name, address, whatsappNumber, openingTime, openDays, bannerImage, description } = req.body;

    let store = await Store.findOne();
    if (store) {
      Object.assign(store, { name, address, whatsappNumber, openingTime, openDays, bannerImage, description, isLocked: true });
      if (!store.publicSlug) store.publicSlug = slugify(name);
      await store.save();
    } else {
      store = await Store.create({
        name,
        address,
        whatsappNumber,
        openingTime,
        openDays,
        bannerImage,
        description,
        publicSlug: slugify(name),
        isLocked: true,
      });
    }
    res.json(formatStore(store));
  } catch (err) {
    req.log.error({ err }, "Create store error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/store", requireAuth, async (req, res) => {
  try {
    const store = await Store.findOne();
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const { name, address, whatsappNumber, openingTime, openDays, bannerImage, description } = req.body;
    if (name !== undefined) store.name = name;
    if (address !== undefined) store.address = address;
    if (whatsappNumber !== undefined) store.whatsappNumber = whatsappNumber;
    if (openingTime !== undefined) store.openingTime = openingTime;
    if (openDays !== undefined) store.openDays = openDays;
    if (bannerImage !== undefined) store.bannerImage = bannerImage;
    if (description !== undefined) store.description = description;
    store.isLocked = false;
    await store.save();

    res.json(formatStore(store));
  } catch (err) {
    req.log.error({ err }, "Update store error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
