import { Router } from "express";
import { Booking } from "../models/Booking";
import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { Notification } from "../models/Notification";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";
import { bookingRateLimiter } from "../middlewares/rateLimiter";

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

async function getMyProductIds(userId: string): Promise<string[]> {
  const store = await Store.findOne({ ownerId: userId });
  if (!store) return [];
  const products = await Product.find({ storeId: String(store._id) }).select("_id").lean();
  return products.map((p) => String(p._id));
}

/** Verify that a booking belongs to the calling admin's store */
async function verifyBookingOwnership(bookingId: string, userId: string): Promise<boolean> {
  const booking = await Booking.findById(bookingId).select("productId").lean();
  if (!booking) return false;
  const store = await Store.findOne({ ownerId: userId }).select("_id").lean();
  if (!store) return false;
  const product = await Product.findById(booking.productId).select("storeId").lean();
  if (!product) return false;
  return product.storeId === String(store._id);
}

function formatBooking(b: InstanceType<typeof Booking>) {
  return {
    id: String(b._id),
    productId: String(b.productId),
    product: formatProduct(b.populated("productId") ? (b.productId as unknown as InstanceType<typeof Product>) : null),
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    customerAddress: b.customerAddress,
    selectedSize: b.selectedSize,
    ignored: b.ignored,
    seenByAdmin: b.seenByAdmin,
    tryOnImage: b.tryOnImage ?? null,
    completed: b.completed ?? false,
    completedAt: b.completedAt ? b.completedAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/bookings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const myProductIds = await getMyProductIds(userId);

    if (myProductIds.length === 0) {
      res.json([]);
      return;
    }

    const bookings = await Booking.find({
      ignored: false,
      completed: { $ne: true },
      productId: { $in: myProductIds },
    })
      .populate("productId")
      .sort({ createdAt: -1 });

    res.json(bookings.map(formatBooking));
  } catch (err) {
    req.log.error({ err }, "List bookings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bookings/completed", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const myProductIds = await getMyProductIds(userId);

    if (myProductIds.length === 0) {
      res.json([]);
      return;
    }

    const bookings = await Booking.find({
      completed: true,
      productId: { $in: myProductIds },
    })
      .populate("productId")
      .sort({ completedAt: -1 });

    res.json(bookings.map(formatBooking));
  } catch (err) {
    req.log.error({ err }, "List completed bookings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings", bookingRateLimiter, requireDb, async (req, res) => {
  try {
    const { productId, customerName, customerPhone, customerAddress, selectedSize, tryOnImage } = req.body;

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
      tryOnImage: tryOnImage || undefined,
    });

    const notifMessage = tryOnImage
      ? `🪞 Virtual Try-On booking for "${product.name}" by ${customerName}`
      : `New booking for "${product.name}" by ${customerName}`;

    // Fire-and-forget — notification failure must not orphan or roll back the booking
    Notification.create({
      type: "booking",
      message: notifMessage,
      relatedId: String(booking._id),
      storeId: product.storeId ?? undefined,
    }).catch((notifErr) => {
      req.log?.error({ err: notifErr }, "Failed to create booking notification");
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

router.patch("/bookings/:id/complete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const isOwner = await verifyBookingOwnership(req.params.id, userId);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied: this booking does not belong to your store" });
      return;
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, ignored: { $ne: true } },
      { completed: true, completedAt: new Date() },
      { new: true }
    ).populate("productId");

    if (!booking) {
      // Either not found or was in ignored state
      const exists = await Booking.findById(req.params.id).select("ignored").lean();
      if (!exists) {
        res.status(404).json({ error: "Booking not found" });
      } else {
        res.status(400).json({ error: "Cannot complete a booking that has been ignored" });
      }
      return;
    }

    res.json(formatBooking(booking));
  } catch (err) {
    req.log.error({ err }, "Complete booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/bookings/:id/seen", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const isOwner = await verifyBookingOwnership(req.params.id, userId);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied: this booking does not belong to your store" });
      return;
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { seenByAdmin: true },
      { new: true }
    ).populate("productId");

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json({ id: String(booking._id), seenByAdmin: booking.seenByAdmin });
  } catch (err) {
    req.log.error({ err }, "Mark booking seen error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/bookings/:id/ignore", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const isOwner = await verifyBookingOwnership(req.params.id, userId);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied: this booking does not belong to your store" });
      return;
    }

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
