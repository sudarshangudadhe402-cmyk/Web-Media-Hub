import { Router } from "express";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { Notification } from "../models/Notification";
import { Booking } from "../models/Booking";
import { LikeEvent } from "../models/LikeEvent";

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

router.get("/public/store/:slug", async (req, res) => {
  try {
    const store = await Store.findOne({ publicSlug: req.params.slug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    const products = await Product.find({ storeId: String(store._id) }).sort({ createdAt: -1 });
    const productIds = products.map((p) => String(p._id));

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const recentEvents = await LikeEvent.aggregate([
      { $match: { productId: { $in: productIds }, createdAt: { $gte: since } } },
      { $group: { _id: { productId: "$productId", type: "$type" }, count: { $sum: 1 } } },
    ]);

    const recentMap: Record<string, { like: number; tryon: number }> = {};
    for (const e of recentEvents) {
      const pid = e._id.productId;
      if (!recentMap[pid]) recentMap[pid] = { like: 0, tryon: 0 };
      if (e._id.type === "like") recentMap[pid].like = e.count;
      if (e._id.type === "tryon") recentMap[pid].tryon = e.count;
    }

    res.json({
      id: String(store._id),
      name: store.name,
      address: store.address ?? null,
      whatsappNumber: store.whatsappNumber ?? null,
      openingTime: store.openingTime ?? null,
      openDays: store.openDays ?? null,
      bannerImage: store.bannerImage ?? null,
      description: store.description ?? null,
      publicSlug: store.publicSlug,
      products: products.map((p) => {
        const pid = String(p._id);
        return {
          id: pid,
          name: p.name,
          description: p.description ?? null,
          images: p.images,
          discountPrice: p.discountPrice,
          actualPrice: p.actualPrice,
          productType: p.productType,
          functionCategory: p.functionCategory ?? null,
          sizes: p.sizes,
          age: p.age ?? null,
          gender: p.gender ?? null,
          likeCount: p.likeCount,
          tryOnLikeCount: p.tryOnLikeCount ?? 0,
          recentLikeCount: recentMap[pid]?.like ?? 0,
          recentTryOnCount: recentMap[pid]?.tryon ?? 0,
        };
      }),
    });
  } catch (err) {
    req.log.error({ err }, "Public store fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/booking-status/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("seenByAdmin completed completedAt").lean();
    if (!booking) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      seenByAdmin: booking.seenByAdmin ?? false,
      completed: (booking as any).completed ?? false,
      completedAt: (booking as any).completedAt ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Public like — called from storefront, no auth required */
router.post("/public/products/:id/like", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    product.likeCount += 1;
    await product.save();
    await LikeEvent.create({ productId: String(product._id), type: "like" });
    await Notification.create({
      type: "like",
      message: `Someone liked "${product.name}"`,
      relatedId: String(product._id),
      storeId: product.storeId ?? undefined,
    });
    res.json({ likeCount: product.likeCount });
  } catch (err) {
    req.log.error({ err }, "Public like error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* Virtual Try-On — increments tryOnLikeCount separately */
router.post("/public/products/:id/tryon", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    product.tryOnLikeCount = (product.tryOnLikeCount ?? 0) + 1;
    await product.save();
    await LikeEvent.create({ productId: String(product._id), type: "tryon" });
    await Notification.create({
      type: "like",
      message: `A customer tried "${product.name}" virtually (Virtual Try-On)`,
      relatedId: String(product._id),
      storeId: product.storeId ?? undefined,
    });
    res.json({ success: true, tryOnLikeCount: product.tryOnLikeCount });
  } catch (err) {
    req.log.error({ err }, "Try-on notification error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
