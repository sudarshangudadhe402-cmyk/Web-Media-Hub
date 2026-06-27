import { Router, Request, Response, NextFunction } from "express";
import { Store } from "../models/Store";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Notification } from "../models/Notification";
import { Booking } from "../models/Booking";
import { LikeEvent } from "../models/LikeEvent";
import { StoreVisitor } from "../models/StoreVisitor";
import { CustomerAccount } from "../models/CustomerAccount";
import { Review } from "../models/Review";

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ─── In-memory IP rate limiter for public endpoints ──────────────────────────
const _rlStore = new Map<string, { count: number; resetAt: number }>();

// Clean stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of _rlStore.entries()) {
    if (now > rec.resetAt) _rlStore.delete(key);
  }
}, 10 * 60 * 1000);

function ipRateLimit(maxReqs: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const key = `${req.path}::${ip}`;
    const now = Date.now();
    const rec = _rlStore.get(key);

    if (!rec || now > rec.resetAt) {
      _rlStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    rec.count++;
    if (rec.count > maxReqs) {
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }
    next();
  };
}
// ─────────────────────────────────────────────────────────────────────────────

router.get("/public/store/:slug", async (req, res) => {
  try {
    const store = await Store.findOne({ publicSlug: req.params.slug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    const [products, storeCategories] = await Promise.all([
      Product.find({ storeId: String(store._id) }).sort({ createdAt: -1 }),
      Category.find({ storeId: String(store._id) }).sort({ createdAt: 1 }),
    ]);
    const productIds = products.map((p) => String(p._id));

    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const recentEvents = await LikeEvent.aggregate([
      { $match: { productId: { $in: productIds }, createdAt: { $gte: since } } },
      { $group: { _id: { productId: "$productId", type: "$type" }, count: { $sum: 1 } } },
    ]);

    const recentMap: Record<string, { like: number; tryon: number }> = {};
    for (const e of recentEvents) {
      const pid = e._id.productId;
      if (!recentMap[pid]) recentMap[pid] = { like: 0, tryon: 0 };
      if (e._id.type === "like") recentMap[pid].like = e.count;
      if (e._id.type === "tryon") recentMap[pid].tryon = e.count;
    }

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
      categories: storeCategories.map((c) => ({
        id: String(c._id),
        name: c.name,
        coverImage: c.coverImage ?? null,
        description: c.description ?? null,
      })),
      products: products.map((p) => {
        const pid = String(p._id);
        return {
          id: pid,
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
          tryOnLikeCount: p.tryOnLikeCount ?? 0,
          recentLikeCount: recentMap[pid]?.like ?? 0,
          recentTryOnCount: recentMap[pid]?.tryon ?? 0,
        };
      }),
    });
  } catch (err) {
    req.log.error({ err }, "Public store fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Visit tracking — max 1 count per IP per store per hour
router.post(
  "/public/store/:slug/visit",
  ipRateLimit(1, 60 * 60_000),
  async (req, res) => {
    try {
      const store = await Store.findOne({ publicSlug: req.params.slug }).select("_id").lean();
      if (!store) { res.status(404).json({ error: "Store not found" }); return; }

      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "unknown";

      await StoreVisitor.create({ storeId: String(store._id), visitorIp: ip, visitedAt: new Date() });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  }
);

router.get("/public/booking-status/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select("seenByAdmin completed completedAt").lean();
    if (!booking) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      seenByAdmin: booking.seenByAdmin ?? false,
      completed: (booking as any).completed ?? false,
      completedAt: (booking as any).completedAt ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Rate-limited: max 10 likes per IP per minute per product
router.post(
  "/public/products/:id/like",
  ipRateLimit(10, 60_000),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      product.likeCount += 1;
      await product.save();
      await LikeEvent.create({ productId: String(product._id), type: "like" });
      await Notification.create({
        type: "like",
        message: `Someone liked "${product.name}"`,
        relatedId: String(product._id),
        storeId: product.storeId ?? undefined,
      });
      res.json({ likeCount: product.likeCount });
    } catch (err) {
      req.log.error({ err }, "Public like error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Rate-limited: max 5 try-ons per IP per minute per product
router.post(
  "/public/products/:id/tryon",
  ipRateLimit(5, 60_000),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      product.tryOnLikeCount = (product.tryOnLikeCount ?? 0) + 1;
      await product.save();
      await LikeEvent.create({ productId: String(product._id), type: "tryon" });
      await Notification.create({
        type: "like",
        message: `A customer tried "${product.name}" virtually (Virtual Try-On)`,
        relatedId: String(product._id),
        storeId: product.storeId ?? undefined,
      });
      res.json({ success: true, tryOnLikeCount: product.tryOnLikeCount });
    } catch (err) {
      req.log.error({ err }, "Try-on notification error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Reviews ─────────────────────────────────────────────────────────────────

router.get("/public/reviews/:productId", async (req, res) => {
  try {
    const { storeId } = req.query;
    if (!storeId) { res.status(400).json({ error: "storeId required" }); return; }
    const reviews = await Review.find({ productId: req.params.productId, storeId }).sort({ createdAt: -1 });
    res.json(reviews.map(r => ({
      id: String(r._id),
      customerId: r.customerId,
      maskedMobile: r.maskedMobile,
      text: r.text,
      likeCount: r.likes.length,
      likes: r.likes,
      createdAt: (r as any).createdAt.toISOString(),
      updatedAt: (r as any).updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Get reviews error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/reviews", ipRateLimit(5, 60_000), async (req, res) => {
  try {
    const { productId, storeId, customerId, text } = req.body;
    if (!productId || !storeId || !customerId || !text?.trim()) {
      res.status(400).json({ error: "All fields required" }); return;
    }
    if (text.trim().length > 500) {
      res.status(400).json({ error: "Review too long (max 500 characters)" }); return;
    }
    const account = await CustomerAccount.findOne({ _id: customerId, storeId });
    if (!account) { res.status(403).json({ error: "Invalid customer account" }); return; }
    const existing = await Review.findOne({ productId, customerId });
    if (existing) { res.status(409).json({ error: "You already reviewed this product" }); return; }
    const maskedMobile = "User ***" + account.mobileNumber.slice(-4);
    const review = await Review.create({ productId, storeId, customerId, maskedMobile, text: text.trim(), likes: [] });
    res.status(201).json({
      id: String(review._id),
      customerId: review.customerId,
      maskedMobile: review.maskedMobile,
      text: review.text,
      likeCount: 0,
      likes: [],
      createdAt: (review as any).createdAt.toISOString(),
      updatedAt: (review as any).updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create review error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/public/reviews/:id", ipRateLimit(10, 60_000), async (req, res) => {
  try {
    const { customerId, text } = req.body;
    if (!customerId || !text?.trim()) { res.status(400).json({ error: "customerId and text required" }); return; }
    if (text.trim().length > 500) { res.status(400).json({ error: "Review too long (max 500 characters)" }); return; }
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }
    if (review.customerId !== customerId) { res.status(403).json({ error: "Not your review" }); return; }
    review.text = text.trim();
    await review.save();
    res.json({ id: String(review._id), text: review.text, updatedAt: (review as any).updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Edit review error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/public/reviews/:id", async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) { res.status(400).json({ error: "customerId required" }); return; }
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }
    if (review.customerId !== customerId) { res.status(403).json({ error: "Not your review" }); return; }
    await review.deleteOne();
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete review error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/reviews/:id/like", ipRateLimit(20, 60_000), async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) { res.status(400).json({ error: "customerId required" }); return; }
    const review = await Review.findById(req.params.id);
    if (!review) { res.status(404).json({ error: "Review not found" }); return; }
    if (review.customerId === customerId) { res.status(400).json({ error: "Cannot like your own review" }); return; }
    const idx = review.likes.indexOf(customerId);
    if (idx === -1) { review.likes.push(customerId); }
    else { review.likes.splice(idx, 1); }
    await review.save();
    res.json({ likeCount: review.likes.length, liked: idx === -1 });
  } catch (err) {
    req.log.error({ err }, "Like review error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Partner code validation (public — no auth) ────────────────────────────────
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { ReferralCode } from "../models/ReferralCode";
import { User } from "../models/User";

router.get(
  "/public/validate-partner-code",
  ipRateLimit(30, 60_000),
  async (req: Request, res: Response) => {
    const code = String(req.query.code || "").toUpperCase().trim();
    if (!code) { res.status(400).json({ error: "code required" }); return; }

    try {
      const inf = await Influencer.findOne({ coupon_code: code }).lean();
      if (inf) {
        res.json({
          valid: true, type: "influencer", name: inf.name, code: inf.coupon_code,
          discount_percentage: (inf as any).customer_discount_percentage ?? 0,
          commission_percentage: inf.commission_percentage,
        });
        return;
      }

      const amb = await Ambassador.findOne({ referral_code: code }).lean();
      if (amb) {
        res.json({
          valid: true, type: "ambassador", name: amb.name, city: amb.city, code: amb.referral_code,
          discount_percentage: (amb as any).customer_discount_percentage ?? 0,
          commission_percentage: amb.commission_percentage,
        });
        return;
      }

      const rc = await ReferralCode.findOne({ referral_code: code })
        .populate<{ owner_admin_id: any }>("owner_admin_id", "username")
        .lean();
      if (rc) {
        const owner = (rc as any).owner_admin_id;
        res.json({
          valid: true, type: "referral", name: owner?.username || "Admin", code: rc.referral_code,
          discount_percentage: (rc as any).customer_discount_percentage ?? 0,
          commission_percentage: (rc as any).commission_percentage ?? 0,
        });
        return;
      }

      res.json({ valid: false });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Partner profile (public — no auth, used by partnership page) ──────────────

router.get(
  "/public/partner/:type/:code",
  ipRateLimit(60, 60_000),
  async (req: Request, res: Response) => {
    const type = req.params.type.toLowerCase();
    const code = req.params.code.toUpperCase();

    if (!["influencer", "ambassador", "referral"].includes(type)) {
      res.status(400).json({ error: "Invalid partner type" });
      return;
    }

    try {
      let member: any = null;
      let signupSource = "";

      if (type === "influencer") {
        const inf = await Influencer.findOne({ coupon_code: code }).lean();
        if (!inf) { res.status(404).json({ error: "Partner not found" }); return; }
        member = {
          type: "influencer",
          name: inf.name,
          code: inf.coupon_code,
          commission_percentage: inf.commission_percentage,
          total_signups: inf.total_signups,
          total_paid_admins: inf.total_paid_admins,
          total_revenue: inf.total_revenue,
          joinedAt: (inf as any).createdAt,
        };
        signupSource = "INFLUENCER";
      } else if (type === "ambassador") {
        const amb = await Ambassador.findOne({ referral_code: code }).lean();
        if (!amb) { res.status(404).json({ error: "Partner not found" }); return; }
        member = {
          type: "ambassador",
          name: amb.name,
          city: amb.city,
          code: amb.referral_code,
          commission_percentage: amb.commission_percentage,
          total_signups: amb.total_signups,
          total_paid_admins: amb.total_paid_admins,
          total_revenue: amb.total_revenue,
          joinedAt: (amb as any).createdAt,
        };
        signupSource = "AMBASSADOR";
      } else {
        const rc = await ReferralCode.findOne({ referral_code: code })
          .populate<{ owner_admin_id: any }>("owner_admin_id", "username email adminNumber planName planBadge")
          .lean();
        if (!rc) { res.status(404).json({ error: "Partner not found" }); return; }
        const owner = (rc as any).owner_admin_id;
        member = {
          type: "referral",
          name: owner?.username || "Admin",
          email: owner?.email || "",
          code: rc.referral_code,
          commission_percentage: null,
          total_signups: rc.total_signups,
          total_paid_admins: rc.total_paid_admins,
          total_revenue: null,
          joinedAt: (rc as any).createdAt,
          owner_plan: owner?.planName || "",
        };
        signupSource = "REFERRAL";
      }

      // Fetch admins who signed up via this code
      const signups = await User.find(
        { signup_source: signupSource, coupon_code: code, role: "admin" },
        {
          email: 1, adminNumber: 1, planName: 1, planPrice: 1, planBadge: 1,
          subscriptionStartDate: 1, subscriptionEndDate: 1, createdAt: 1, isActive: 1,
        }
      )
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      res.json({
        member,
        signups: signups.map((u: any) => ({
          email: u.email || "",
          adminNumber: u.adminNumber || "",
          planName: u.planName || "—",
          planPrice: u.planPrice || "—",
          planBadge: u.planBadge || "",
          isActive: u.isActive,
          subscriptionStartDate: u.subscriptionStartDate ? new Date(u.subscriptionStartDate).toISOString() : null,
          subscriptionEndDate: u.subscriptionEndDate ? new Date(u.subscriptionEndDate).toISOString() : null,
          signedUpAt: new Date(u.createdAt).toISOString(),
        })),
      });
    } catch (err) {
      (req as any).log?.error({ err }, "Partner profile error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
// ─────────────────────────────────────────────────────────────────────────────

export default router;
