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

router.get("/products/upload-model", requireAuth, async (req, res) => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/products/upload-model", requireAuth, async (req, res) => {
  try {
    const { modelData, fileName } = req.body;
    if (!modelData) {
      res.status(400).json({ error: "modelData is required" });
      return;
    }
    const ext = fileName?.split(".").pop()?.toLowerCase() || "glb";
    const url = `data:model/${ext};base64,${modelData}`;
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Upload model error");
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

export default router;
