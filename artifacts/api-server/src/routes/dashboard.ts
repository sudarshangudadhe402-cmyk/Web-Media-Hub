import { Router } from "express";
import { Product } from "../models/Product";
import { Booking } from "../models/Booking";
import { Notification } from "../models/Notification";
import { Store } from "../models/Store";
import { StoreVisitor } from "../models/StoreVisitor";
import { AuthRequest, requireAuth } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId });
    const storeId = store ? String(store._id) : null;

    const storeFilter = storeId ? { storeId } : { storeId: "__none__" };

    // Visitor time windows
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      totalProducts,
      topCount,
      bottomCount,
      fullOutfitCount,
      functionalCount,
      unreadNotifications,
      funcCatCount,
      dayVisitorsAgg,
      monthVisitorsAgg,
      allVisitorsAgg,
    ] = await Promise.all([
      Product.countDocuments(storeFilter),
      Product.countDocuments({ ...storeFilter, productType: "Top" }),
      Product.countDocuments({ ...storeFilter, productType: "Bottom" }),
      Product.countDocuments({ ...storeFilter, productType: "Full Outfit" }),
      Product.countDocuments({ ...storeFilter, productType: "Functional" }),
      storeId ? Notification.countDocuments({ read: false, storeId }) : Promise.resolve(0),
      Product.countDocuments({ ...storeFilter, functionCategory: { $exists: true, $nin: [null, ""] } }),
      storeId
        ? StoreVisitor.aggregate([
            { $match: { storeId, visitedAt: { $gte: todayStart } } },
            { $group: { _id: "$visitorIp" } },
            { $count: "total" },
          ])
        : Promise.resolve([]),
      storeId
        ? StoreVisitor.aggregate([
            { $match: { storeId, visitedAt: { $gte: monthStart } } },
            { $group: { _id: "$visitorIp" } },
            { $count: "total" },
          ])
        : Promise.resolve([]),
      storeId
        ? StoreVisitor.aggregate([
            { $match: { storeId } },
            { $group: { _id: "$visitorIp" } },
            { $count: "total" },
          ])
        : Promise.resolve([]),
    ]);

    const myProductIds = storeId
      ? (await Product.find({ storeId }).select("_id").lean()).map((p) => String(p._id))
      : [];

    const [activeBookings, unseenBookings, recentBookingsDocs] = await Promise.all([
      myProductIds.length > 0
        ? Booking.countDocuments({ ignored: false, productId: { $in: myProductIds } })
        : Promise.resolve(0),
      myProductIds.length > 0
        ? Booking.countDocuments({ ignored: false, seenByAdmin: false, productId: { $in: myProductIds } })
        : Promise.resolve(0),
      myProductIds.length > 0
        ? Booking.find({ ignored: false, productId: { $in: myProductIds } })
            .populate("productId")
            .sort({ createdAt: -1 })
            .limit(5)
        : Promise.resolve([]),
    ]);

    const functionalTotal = functionalCount + funcCatCount;

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
        tryOnImage: b.tryOnImage ?? null,
        createdAt: b.createdAt.toISOString(),
      };
    });

    res.json({
      totalProducts,
      categoryCounts: {
        Top: topCount,
        Bottom: bottomCount,
        "Full Outfit": fullOutfitCount,
        Functional: functionalTotal,
      },
      activeBookings,
      unseenBookings,
      unreadNotifications,
      recentBookings,
      storeName: store?.name ?? "",
      storeAddress: store?.address ?? "",
      storePhone: store?.whatsappNumber ?? "",
      visitors: {
        today: (dayVisitorsAgg as { total: number }[])[0]?.total ?? 0,
        month: (monthVisitorsAgg as { total: number }[])[0]?.total ?? 0,
        all: (allVisitorsAgg as { total: number }[])[0]?.total ?? 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
