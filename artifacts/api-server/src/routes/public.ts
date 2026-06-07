import { Router } from "express";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { Notification } from "../models/Notification";
import { Booking } from "../models/Booking";

const router = Router();

router.get("/public/store/:slug", async (req, res) => {
  try {
    const store = await Store.findOne({ publicSlug: req.params.slug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    const products = await Product.find({ storeId: String(store._id) }).sort({ createdAt: -1 });
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
      products: products.map((p) => ({
        id: String(p._id),
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
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Public store fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/booking-status/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("seenByAdmin").lean();
    if (!booking) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ seenByAdmin: booking.seenByAdmin ?? false });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/products/:id/tryon", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    product.likeCount += 1;
    await product.save();
    await Notification.create({
      type: "like",
      message: `A customer tried "${product.name}" virtually (Virtual Try-On)`,
      relatedId: String(product._id),
    });
    res.json({ success: true, likeCount: product.likeCount });
  } catch (err) {
    req.log.error({ err }, "Try-on notification error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
