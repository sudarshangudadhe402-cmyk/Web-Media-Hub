import { Router } from "express";
import { Booking } from "../models/Booking";
import { Product } from "../models/Product";
import { Notification } from "../models/Notification";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

function formatProduct(p: InstanceType<typeof Product> | null) {
  if (!p) return null;
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
    likeCount: p.likeCount,
    storeId: p.storeId ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ ignored: false })
      .populate("productId")
      .sort({ createdAt: -1 });

    res.json(
      bookings.map((b) => ({
        id: String(b._id),
        productId: String(b.productId),
        product: formatProduct(b.populated("productId") ? (b.productId as unknown as InstanceType<typeof Product>) : null),
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerAddress: b.customerAddress,
        selectedSize: b.selectedSize,
        ignored: b.ignored,
        createdAt: b.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "List bookings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { productId, customerName, customerPhone, customerAddress, selectedSize } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const booking = await Booking.create({
      productId,
      customerName,
      customerPhone,
      customerAddress,
      selectedSize,
    });

    await Notification.create({
      type: "booking",
      message: `New booking for "${product.name}" by ${customerName}`,
      relatedId: String(booking._id),
    });

    res.status(201).json({
      id: String(booking._id),
      productId: String(booking.productId),
      product: formatProduct(product),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      selectedSize: booking.selectedSize,
      ignored: booking.ignored,
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/bookings/:id/ignore", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ignored: true },
      { new: true }
    ).populate("productId");

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json({
      id: String(booking._id),
      productId: String(booking.productId),
      product: formatProduct(booking.populated("productId") ? (booking.productId as unknown as InstanceType<typeof Product>) : null),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      selectedSize: booking.selectedSize,
      ignored: booking.ignored,
      createdAt: booking.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Ignore booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
