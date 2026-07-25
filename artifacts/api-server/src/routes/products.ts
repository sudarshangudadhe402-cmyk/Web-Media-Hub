import { Router } from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { Notification } from "../models/Notification";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";
import { validateUploadedFile, recordUploadViolation } from "../middlewares/uploadValidator";

const router = Router();

function formatProduct(p: InstanceType<typeof Product>) {
  return {
    id: String(p._id),
    name: p.name,
    brandName: p.brandName ?? null,
    description: p.description ?? null,
    images: p.images,
    modelUrl: p.modelUrl ?? null,
    discountPrice: p.discountPrice,
    actualPrice: p.actualPrice,
    functionCategory: p.functionCategory ?? null,
    productType: p.productType,
    sizes: p.sizes,
    age: p.age ?? null,
    gender: p.gender ?? null,
    stock: p.stock ?? 0,
    colours: p.colours ?? [],
    likeCount: p.likeCount,
    tryOnLikeCount: p.tryOnLikeCount ?? 0,
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
    const { name, brandName, description, images, modelUrl, discountPrice, actualPrice, functionCategory, productType, sizes, age, gender, stock, colours } = req.body;
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);

    if (!store) {
      res.status(400).json({ error: "You do not have a store. Please set up your store first." });
      return;
    }

    const existingCount = await Product.countDocuments({ storeId: String(store._id) });
    if (existingCount >= 1000) {
      res.status(400).json({ error: "Your store product add limit crossed, you can't add product more." });
      return;
    }

    const product = await Product.create({
      name,
      brandName,
      description,
      images: images || [],
      modelUrl,
      discountPrice,
      actualPrice,
      functionCategory,
      productType,
      sizes: sizes || [],
      age,
      gender,
      stock: stock ?? 0,
      colours: colours || [],
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

router.post("/products/upload-image", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { imageData, fileName } = req.body;
    if (!imageData) {
      res.status(400).json({ error: "imageData is required" });
      return;
    }

    const result = validateUploadedFile(imageData, fileName ?? "upload.jpg", "image");
    if (!result.ok) {
      const userId = String(req.user!._id);
      const blocked = await recordUploadViolation(userId, req.log as any);
      if (blocked) {
        res.status(403).json({ error: "Your account has been blocked due to repeated invalid upload attempts." });
      } else {
        res.status(400).json({ error: result.reason ?? "Invalid file" });
      }
      return;
    }

    // Serve as a data URI — content-type locked to detected MIME, never executable
    const url = `data:${result.detectedMime};base64,${imageData}`;
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Upload image error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/upload-model", requireAuth, async (req, res) => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/products/upload-model", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { modelData, fileName } = req.body;
    if (!modelData) {
      res.status(400).json({ error: "modelData is required" });
      return;
    }

    const result = validateUploadedFile(modelData, fileName ?? "upload.glb", "model");
    if (!result.ok) {
      const userId = String(req.user!._id);
      const blocked = await recordUploadViolation(userId, req.log as any);
      if (blocked) {
        res.status(403).json({ error: "Your account has been blocked due to repeated invalid upload attempts." });
      } else {
        res.status(400).json({ error: result.reason ?? "Invalid file" });
      }
      return;
    }

    // Serve as a data URI — content-type locked to detected MIME, never executable
    const url = `data:${result.detectedMime};base64,${modelData}`;
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Upload model error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ error: "Product not found" }); return;
    }
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    // Require an owned store — deny access if user has no store OR product belongs to another store
    if (!store || product.storeId !== String(store._id)) {
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ error: "Product not found" }); return;
    }
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (!store || existing.storeId !== String(store._id)) {
      res.status(403).json({ error: "You can only edit your own store's products" });
      return;
    }

    // Whitelist allowed fields — never pass req.body directly to prevent
    // clients from overwriting storeId, likeCount, tryOnLikeCount, _id, etc.
    const {
      name, brandName, description, images, modelUrl,
      discountPrice, actualPrice, functionCategory, productType,
      sizes, age, gender, stock, colours,
    } = req.body;
    const allowedUpdate: Record<string, unknown> = {};
    if (name !== undefined) allowedUpdate.name = name;
    if (brandName !== undefined) allowedUpdate.brandName = brandName;
    if (description !== undefined) allowedUpdate.description = description;
    if (images !== undefined) allowedUpdate.images = images;
    if (modelUrl !== undefined) allowedUpdate.modelUrl = modelUrl;
    if (discountPrice !== undefined) allowedUpdate.discountPrice = discountPrice;
    if (actualPrice !== undefined) allowedUpdate.actualPrice = actualPrice;
    if (functionCategory !== undefined) allowedUpdate.functionCategory = functionCategory;
    if (productType !== undefined) allowedUpdate.productType = productType;
    if (sizes !== undefined) allowedUpdate.sizes = sizes;
    if (age !== undefined) allowedUpdate.age = age;
    if (gender !== undefined) allowedUpdate.gender = gender;
    if (stock !== undefined) allowedUpdate.stock = stock;
    if (colours !== undefined) allowedUpdate.colours = colours;

    const product = await Product.findByIdAndUpdate(req.params.id, { $set: allowedUpdate }, { new: true });
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ error: "Product not found" }); return;
    }
    const userId = String(req.user!._id);
    const store = await getMyStore(userId);
    const existing = await Product.findById(req.params.id);

    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (!store || existing.storeId !== String(store._id)) {
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

export default router;
