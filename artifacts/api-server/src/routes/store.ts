import { Router } from "express";
import { Store, type IStoreAddressDetails } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { parseIndiaCoordinatePair } from "../lib/indiaGeo";

const router = Router();

function slugify(_text: string): string {
  const rand = Math.random().toString(36).slice(2, 9).toUpperCase();
  return `WMH-${rand}`;
}

function formatStore(s: InstanceType<typeof Store>) {
  return {
    id: String(s._id),
    name: s.name,
    address: s.address ?? null,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    addressDetails: s.addressDetails ?? null,
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

async function getStoreForUser(userId: string) {
  return Store.findOne({ ownerId: userId });
}

router.get("/store", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getStoreForUser(userId);
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

router.post("/store", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const { name, address, latitude, longitude, addressDetails, whatsappNumber, openingTime, openDays, bannerImage, description } = req.body;
    const coordinates = parseIndiaCoordinatePair(latitude, longitude);
    if ((latitude !== undefined || longitude !== undefined) && !coordinates) {
      res.status(400).json({ error: "Store location must be inside India." });
      return;
    }

    let store = await getStoreForUser(userId);
    if (store) {
      store.name = name;
      store.address = address;
      store.latitude = coordinates?.latitude;
      store.longitude = coordinates?.longitude;
      store.addressDetails = addressDetails ?? undefined;
      store.whatsappNumber = whatsappNumber;
      store.openingTime = openingTime;
      store.openDays = openDays;
      store.bannerImage = bannerImage;
      store.description = description;
      // Do NOT touch isLocked here — preserve whatever super admin has set
      if (!store.publicSlug) store.publicSlug = slugify(name);
      await store.save();
    } else {
      store = await Store.create({
        ownerId: userId,
        name,
        address,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        addressDetails: addressDetails ?? undefined,
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

router.patch("/store", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getStoreForUser(userId);
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    const { name, address, latitude, longitude, addressDetails, whatsappNumber, openingTime, openDays, bannerImage, description } = req.body;
    const coordinates = (latitude !== undefined || longitude !== undefined)
      ? parseIndiaCoordinatePair(latitude, longitude)
      : null;
    if ((latitude !== undefined || longitude !== undefined) && !coordinates) {
      res.status(400).json({ error: "Store location must be inside India." });
      return;
    }
    if (name !== undefined) store.name = name;
    if (address !== undefined) store.address = address;
    if (coordinates) {
      store.latitude = coordinates.latitude;
      store.longitude = coordinates.longitude;
    }
    if (addressDetails !== undefined) {
      store.addressDetails = addressDetails
        ? addressDetails as IStoreAddressDetails
        : undefined;
    }
    if (whatsappNumber !== undefined) store.whatsappNumber = whatsappNumber;
    if (openingTime !== undefined) store.openingTime = openingTime;
    if (openDays !== undefined) store.openDays = openDays;
    if (bannerImage !== undefined) store.bannerImage = bannerImage;
    if (description !== undefined) store.description = description;
    // isLocked is super-admin only — regular admins cannot change lock state
    await store.save();

    res.json(formatStore(store));
  } catch (err) {
    req.log.error({ err }, "Update store error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
