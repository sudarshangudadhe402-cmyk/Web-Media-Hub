import { Router } from "express";
import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { Notification } from "../models/Notification";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

function formatProduct(p: InstanceType<typeof Product>) {
  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? null,
    images: p.images,
    discountPrice: p.discountPrice,
    actualPrice: p.actualPrice,
    functionCategory: p.functionCategory ?? null,
    productType: p.productType,
    sizes: p.sizes,
    age: p.age ?? null,
    gender: p.gender ?? null,
    likeCount: p.likeCount,
    storeId: p.storeId ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

async function getMyStore(userId: string) {
  return Store.findOne({ ownerId: userId });
}

router.get("/products", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query;
    const userId = String(req.user!._id);

    const store = await getMyStore(userId);
    if (!store) {
      res.json([]);
      return;
    }

    const filter: Record<string, unknown> = { storeId: String(store._id) };
    if (type) filter.productType = type;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products.map(formatProduct));
  } catch (err) {
    req.log.error({ err }, "List products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description, images, discountPrice, actualPrice, functionCategory, productType, sizes, age, gender } = req.body;
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);

    if (!store) {
      res.status(400).json({ error: "You do not have a store. Please set up your store first." });
      return;
    }

    const product = await Product.create({
      name,
      description,
      images: images || [],
      discountPrice,
      actualPrice,
      functionCategory,
      productType,
      sizes: sizes || [],
      age,
      gender,
      storeId: String(store._id),
    });

    res.status(201).json(formatProduct(product));
  } catch (err) {
    req.log.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/upload-image", requireAuth, async (req, res) => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/products/upload-image", requireAuth, async (req, res) => {
  try {
    const { imageData, fileName } = req.body;
    if (!imageData) {
      res.status(400).json({ error: "imageData is required" });
      return;
    }
    const url = `data:image/${fileName?.split(".").pop() || "jpeg"};base64,${imageData}`;
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Upload image error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (store && product.storeId !== String(store._id)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(formatProduct(product));
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (store && existing.storeId !== String(store._id)) {
      res.status(403).json({ error: "You can only edit your own store's products" });
      return;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(formatProduct(product));
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (store && existing.storeId !== String(store._id)) {
      res.status(403).json({ error: "You can only delete your own store's products" });
      return;
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products/:id/like", async (req, res) => {
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
      message: `Someone liked "${product.name}"`,
      relatedId: String(product._id),
      storeId: product.storeId ?? undefined,
    });

    res.json({ likeCount: product.likeCount });
  } catch (err) {
    req.log.error({ err }, "Like product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
