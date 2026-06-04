import { Router } from "express";
import { Store } from "../models/Store";
import { Product } from "../models/Product";

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

export default router;
