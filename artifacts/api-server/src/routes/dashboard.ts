import { Router } from "express";
import { Product } from "../models/Product";
import { Booking } from "../models/Booking";
import { Notification } from "../models/Notification";
import { requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  try {
    const [
      totalProducts,
      topCount,
      bottomCount,
      fullOutfitCount,
      functionalCount,
      activeBookings,
      unreadNotifications,
      recentBookingsDocs,
      funcCatAgg,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ productType: "Top" }),
      Product.countDocuments({ productType: "Bottom" }),
      Product.countDocuments({ productType: "Full Outfit" }),
      Product.countDocuments({ productType: "Functional" }),
      Booking.countDocuments({ ignored: false }),
      Notification.countDocuments({ read: false }),
      Booking.find({ ignored: false })
        .populate("productId")
        .sort({ createdAt: -1 })
        .limit(5),
      Product.aggregate([
        { $match: { functionCategory: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$functionCategory", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const functionCategoryCounts: Record<string, number> = {};
    for (const item of funcCatAgg) {
      if (item._id) functionCategoryCounts[item._id] = item.count;
    }

    const recentBookings = recentBookingsDocs.map((b) => {
      const prod = b.populated("productId") ? (b.productId as Record<string, unknown>) : null;
      return {
        id: String(b._id),
        productId: String(b.productId),
        product: prod
          ? {
              id: String((prod as { _id: unknown })._id),
              name: String(prod.name),
              description: (prod.description as string | undefined) ?? null,
              images: (prod.images as string[]) || [],
              discountPrice: prod.discountPrice as number,
              actualPrice: prod.actualPrice as number,
              functionCategory: (prod.functionCategory as string | undefined) ?? null,
              productType: prod.productType as string,
              sizes: (prod.sizes as string[]) || [],
              likeCount: (prod.likeCount as number) || 0,
              storeId: (prod.storeId as string | undefined) ?? null,
              createdAt: prod.createdAt instanceof Date ? prod.createdAt.toISOString() : String(prod.createdAt),
            }
          : null,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        customerAddress: b.customerAddress,
        selectedSize: b.selectedSize,
        ignored: b.ignored,
        createdAt: b.createdAt.toISOString(),
      };
    });

    res.json({
      totalProducts,
      categoryCounts: {
        Top: topCount,
        Bottom: bottomCount,
        "Full Outfit": fullOutfitCount,
        Functional: functionalCount,
      },
      functionCategoryCounts,
      activeBookings,
      unreadNotifications,
      recentBookings,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
