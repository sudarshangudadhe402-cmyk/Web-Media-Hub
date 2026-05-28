import { Router } from "express";
import { Product } from "../models/Product";
import { Notification } from "../models/Notification";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/products", requireAuth, async (req, res) => {
  try {
    const { type, storeId } = req.query;
    const filter: Record<string, unknown> = {};
    if (type) filter.productType = type;
    if (storeId) filter.storeId = storeId;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(
      products.map((p) => ({
        id: String(p._id),
        name: p.name,
        description: p.description ?? null,
        images: p.images,
        discountPrice: p.discountPrice,
        actualPrice: p.actualPrice,
        functionCategory: p.functionCategory ?? null,
        productType: p.productType,
        sizes: p.sizes,
        likeCount: p.likeCount,
        storeId: p.storeId ?? null,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List products error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products", requireAuth, async (req, res) => {
  try {
    const { name, description, images, discountPrice, actualPrice, functionCategory, productType, sizes } = req.body;
    const product = await Product.create({
      name,
      description,
      images: images || [],
      discountPrice,
      actualPrice,
      functionCategory,
      productType,
      sizes: sizes || [],
    });
    res.status(201).json({
      id: String(product._id),
      name: product.name,
      description: product.description ?? null,
      images: product.images,
      discountPrice: product.discountPrice,
      actualPrice: product.actualPrice,
      functionCategory: product.functionCategory ?? null,
      productType: product.productType,
      sizes: product.sizes,
      likeCount: product.likeCount,
      storeId: product.storeId ?? null,
      createdAt: product.createdAt.toISOString(),
    });
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

router.get("/products/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({
      id: String(product._id),
      name: product.name,
      description: product.description ?? null,
      images: product.images,
      discountPrice: product.discountPrice,
      actualPrice: product.actualPrice,
      functionCategory: product.functionCategory ?? null,
      productType: product.productType,
      sizes: product.sizes,
      likeCount: product.likeCount,
      storeId: product.storeId ?? null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/products/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({
      id: String(product._id),
      name: product.name,
      description: product.description ?? null,
      images: product.images,
      discountPrice: product.discountPrice,
      actualPrice: product.actualPrice,
      functionCategory: product.functionCategory ?? null,
      productType: product.productType,
      sizes: product.sizes,
      likeCount: product.likeCount,
      storeId: product.storeId ?? null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
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
    });

    res.json({ likeCount: product.likeCount });
  } catch (err) {
    req.log.error({ err }, "Like product error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
