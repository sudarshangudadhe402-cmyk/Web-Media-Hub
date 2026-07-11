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

router.get("/public/store/:slug", ipRateLimit(60, 60 * 1000), async (req, res) => {
  try {
    const store = await Store.findOne({ publicSlug: req.params.slug });
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    // Check owner's subscription — if expired, serve a 410 so the customer knows the store is temporarily inactive
    const owner = await User.findById(store.ownerId).select("subscriptionEndDate isActive").lean();
    const subEnd = owner && (owner as any).subscriptionEndDate ? new Date((owner as any).subscriptionEndDate) : null;
    const isExpired = subEnd ? subEnd < new Date() : false;
    const isDeactivated = owner && (owner as any).isActive === false && !isExpired;
    if (isExpired || isDeactivated) {
      res.status(410).json({ error: "Store is temporarily inactive.", code: "STORE_INACTIVE" });
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
      // Use atomic $inc to prevent race conditions / lost counts
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $inc: { likeCount: 1 } },
        { new: true }
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
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
      // Use atomic $inc to prevent race conditions / lost counts
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $inc: { tryOnLikeCount: 1 } },
        { new: true }
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
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

// ─── Cart (account-linked, synced across devices) ───────────────────────────

router.get("/public/cart/:customerId", async (req, res) => {
  try {
    const account = await CustomerAccount.findById(req.params.customerId).select("cart").lean();
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ cart: account.cart ?? [] });
  } catch (err) {
    req.log.error({ err }, "Cart fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/public/cart", ipRateLimit(30, 60_000), async (req, res) => {
  try {
    const { customerId, productId } = req.body as { customerId?: string; productId?: string };
    if (!customerId || !productId) {
      res.status(400).json({ error: "customerId and productId are required" });
      return;
    }
    const product = await Product.findById(productId).select("_id").lean();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const account = await CustomerAccount.findByIdAndUpdate(
      customerId,
      { $addToSet: { cart: productId } },
      { new: true }
    ).select("cart");
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ cart: account.cart });
  } catch (err) {
    req.log.error({ err }, "Add to cart error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/public/cart/:customerId/:productId", async (req, res) => {
  try {
    const { customerId, productId } = req.params;
    const account = await CustomerAccount.findByIdAndUpdate(
      customerId,
      { $pull: { cart: productId } },
      { new: true }
    ).select("cart");
    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json({ cart: account.cart });
  } catch (err) {
    req.log.error({ err }, "Remove from cart error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

router.get("/public/reviews/:productId", async (req, res) => {
  try {
    const { storeId } = req.query;
    if (!storeId) { res.status(400).json({ error: "storeId required" }); return; }
    const reviews = await Review.find({ productId: req.params.productId, storeId }).sort({ createdAt: -1 });
    res.json(reviews.map(r => ({
      id: String(r._id),
      customerId: r.customerId,
      customerName: r.customerName,
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
    const customerName = account.name || "Customer";
    const review = await Review.create({ productId, storeId, customerId, customerName, text: text.trim(), likes: [] });
    res.status(201).json({
      id: String(review._id),
      customerId: review.customerId,
      customerName: review.customerName,
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
import crypto from "crypto";
import { Influencer } from "../models/Influencer";
import { Ambassador } from "../models/Ambassador";
import { ReferralCode } from "../models/ReferralCode";
import { User } from "../models/User";
import { OtpCode } from "../models/OtpCode";
import { Withdrawal } from "../models/Withdrawal";
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { sendPartnerVerificationEmail, sendWithdrawalOtpEmail } from "../services/emailOtp";

// ── Withdrawal session tokens (in-memory, 5-min TTL) ─────────────────────────
const _wdTokens = new Map<string, { type: string; code: string; email: string; name: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _wdTokens.entries()) {
    if (now > v.expiresAt) _wdTokens.delete(k);
  }
}, 60_000);

async function findPartnerForWithdrawal(type: string, code: string) {
  if (type === "influencer") {
    const inf = await Influencer.findOne({ coupon_code: code }).lean();
    if (!inf) return null;
    return { email: (inf as any).email || "", name: inf.name, upi_id: (inf as any).upi_id || "", withdrawable_balance: (inf as any).withdrawable_balance ?? 0 };
  } else if (type === "ambassador") {
    const amb = await Ambassador.findOne({ referral_code: code }).lean();
    if (!amb) return null;
    return { email: (amb as any).email || "", name: amb.name, upi_id: (amb as any).upi_id || "", withdrawable_balance: (amb as any).withdrawable_balance ?? 0 };
  } else if (type === "referral") {
    const rc = await ReferralCode.findOne({ referral_code: code })
      .populate<{ owner_admin_id: any }>("owner_admin_id", "email username")
      .lean();
    if (!rc) return null;
    const owner = (rc as any).owner_admin_id;
    return { email: owner?.email || "", name: owner?.username || "Partner", upi_id: (rc as any).upi_id || "", withdrawable_balance: (rc as any).withdrawable_balance ?? 0 };
  }
  return null;
}
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Partner OTP: send ─────────────────────────────────────────────────────────
router.post(
  "/public/partner/send-otp",
  ipRateLimit(10, 60_000),
  async (req: Request, res: Response) => {
    const { type, code, email } = req.body as { type?: string; code?: string; email?: string };
    if (!type || !code || !email) { res.status(400).json({ error: "type, code and email required" }); return; }
    const t = type.toLowerCase();
    const c = code.toUpperCase().trim();
    const e = email.toLowerCase().trim();

    try {
      let partnerEmail = "";
      let partnerName = "";

      if (t === "influencer") {
        const inf = await Influencer.findOne({ coupon_code: c }).lean();
        if (!inf) { res.status(404).json({ error: "Partner not found" }); return; }
        partnerEmail = (inf as any).email || "";
        partnerName = inf.name;
      } else if (t === "ambassador") {
        const amb = await Ambassador.findOne({ referral_code: c }).lean();
        if (!amb) { res.status(404).json({ error: "Partner not found" }); return; }
        partnerEmail = (amb as any).email || "";
        partnerName = amb.name;
      } else if (t === "referral") {
        const rc = await ReferralCode.findOne({ referral_code: c }).populate<{ owner_admin_id: any }>("owner_admin_id", "email username").lean();
        if (!rc) { res.status(404).json({ error: "Partner not found" }); return; }
        partnerEmail = rc.owner_admin_id?.email || "";
        partnerName = rc.owner_admin_id?.username || "Partner";
      } else {
        res.status(400).json({ error: "Invalid type" }); return;
      }

      // First-time registration: if no email stored, save the provided email
      if (!partnerEmail) {
        if (t === "influencer") {
          await Influencer.updateOne({ coupon_code: c }, { email: e });
        } else if (t === "ambassador") {
          await Ambassador.updateOne({ referral_code: c }, { email: e });
        }
        partnerEmail = e;
      }

      if (partnerEmail !== e) { res.status(400).json({ error: "Email does not match our records for this partner code" }); return; }

      // Invalidate old OTPs for this partner
      await OtpCode.updateMany(
        { email: e, storeId: c, purpose: "partner-verification", used: false },
        { used: true }
      );

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await OtpCode.create({
        email: e,
        storeId: c,
        code: otp,
        purpose: "partner-verification",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendPartnerVerificationEmail(e, otp, partnerName);
      res.json({ success: true });
    } catch (err) {
      console.error("Partner send-otp error:", err);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  }
);

// ── Partner OTP: verify ────────────────────────────────────────────────────────
router.post(
  "/public/partner/verify-otp",
  ipRateLimit(20, 60_000),
  async (req: Request, res: Response) => {
    const { type: _t, code, email, otp } = req.body as { type?: string; code?: string; email?: string; otp?: string };
    if (!code || !email || !otp) { res.status(400).json({ error: "code, email and otp required" }); return; }
    const c = code.toUpperCase().trim();
    const e = email.toLowerCase().trim();

    try {
      const record = await OtpCode.findOne({
        email: e,
        storeId: c,
        code: otp.trim(),
        purpose: "partner-verification",
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!record) { res.status(400).json({ error: "Invalid or expired OTP" }); return; }
      record.used = true;
      await record.save();
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Verification failed" });
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
          email: (inf as any).email || "",
          code: inf.coupon_code,
          commission_percentage: inf.commission_percentage,
          customer_discount_percentage: (inf as any).customer_discount_percentage ?? 0,
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
          email: (amb as any).email || "",
          city: amb.city,
          code: amb.referral_code,
          commission_percentage: amb.commission_percentage,
          customer_discount_percentage: (amb as any).customer_discount_percentage ?? 0,
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
          commission_percentage: (rc as any).commission_percentage ?? 0,
          customer_discount_percentage: (rc as any).customer_discount_percentage ?? 0,
          total_signups: rc.total_signups,
          total_paid_admins: rc.total_paid_admins,
          total_revenue: rc.total_revenue ?? 0,
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

// ── Partner: check if email is already registered ────────────────────────────
router.get(
  "/public/partner/:type/:code/has-email",
  ipRateLimit(30, 60_000),
  async (req: Request, res: Response) => {
    const type = req.params.type.toLowerCase();
    const code = req.params.code.toUpperCase();
    if (!["influencer", "ambassador", "referral"].includes(type)) {
      res.status(400).json({ error: "Invalid partner type" }); return;
    }
    try {
      let hasEmail = false;
      if (type === "influencer") {
        const inf = await Influencer.findOne({ coupon_code: code }, { email: 1 }).lean();
        hasEmail = !!(inf as any)?.email;
      } else if (type === "ambassador") {
        const amb = await Ambassador.findOne({ referral_code: code }, { email: 1 }).lean();
        hasEmail = !!(amb as any)?.email;
      } else {
        const rc = await ReferralCode.findOne({ referral_code: code }).populate<{ owner_admin_id: any }>("owner_admin_id", "email").lean();
        hasEmail = !!rc?.owner_admin_id?.email;
      }
      res.json({ has_email: hasEmail });
    } catch {
      res.json({ has_email: false });
    }
  }
);
// ─────────────────────────────────────────────────────────────────────────────

// ── Wallet: get full wallet data + transaction ledger ─────────────────────────
router.get(
  "/public/partner/:type/:code/wallet",
  ipRateLimit(30, 60_000),
  async (req: Request, res: Response) => {
    const type = req.params.type.toLowerCase();
    const code = req.params.code.toUpperCase();
    if (!["influencer", "ambassador", "referral"].includes(type)) {
      res.status(400).json({ error: "Invalid partner type" }); return;
    }
    try {
      const wallet = await Wallet.findOne({ partnerType: type, partnerCode: code }).lean();
      const transactions = await WalletTransaction.find({ partner_type: type, partner_code: code })
        .sort({ created_at: -1 }).limit(100).lean();
      res.json({
        wallet_balance: wallet?.wallet_balance ?? 0,
        lifetime_earnings: wallet?.lifetime_earnings ?? 0,
        pending_withdrawal: wallet?.pending_withdrawal ?? 0,
        total_withdrawn: wallet?.total_withdrawn ?? 0,
        last_updated: wallet?.last_updated ? new Date(wallet.last_updated).toISOString() : null,
        transactions: transactions.map(tx => ({
          transaction_id: tx.transaction_id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          reference_id: tx.reference_id ?? null,
          created_at: new Date(tx.created_at).toISOString(),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
// ─────────────────────────────────────────────────────────────────────────────

// ── Withdrawal: get balance + history ─────────────────────────────────────────
router.get(
  "/public/partner/:type/:code/withdrawal",
  ipRateLimit(30, 60_000),
  async (req: Request, res: Response) => {
    const type = req.params.type.toLowerCase();
    const code = req.params.code.toUpperCase();
    if (!["influencer", "ambassador", "referral"].includes(type)) {
      res.status(400).json({ error: "Invalid partner type" }); return;
    }
    try {
      const partner = await findPartnerForWithdrawal(type, code);
      if (!partner) { res.status(404).json({ error: "Partner not found" }); return; }
      const history = await Withdrawal.find({ partnerType: type, partnerCode: code })
        .sort({ createdAt: -1 }).limit(50).lean();
      res.json({
        withdrawable_balance: partner.withdrawable_balance,
        upi_id: partner.upi_id,
        history: history.map(w => ({
          requestId: w.requestId,
          amount: w.amount,
          upiId: w.upiId,
          status: w.status,
          createdAt: (w as any).createdAt.toISOString(),
          completedAt: w.completedAt ? new Date(w.completedAt).toISOString() : null,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Withdrawal: update UPI ID ─────────────────────────────────────────────────
router.patch(
  "/public/partner/:type/:code/upi",
  ipRateLimit(10, 60_000),
  async (req: Request, res: Response) => {
    const type = req.params.type.toLowerCase();
    const code = req.params.code.toUpperCase();
    const { email, upiId } = req.body as { email?: string; upiId?: string };
    if (!["influencer", "ambassador", "referral"].includes(type)) {
      res.status(400).json({ error: "Invalid partner type" }); return;
    }
    if (!email || !upiId) { res.status(400).json({ error: "email and upiId required" }); return; }
    const upi = upiId.trim();
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upi)) {
      res.status(400).json({ error: "Invalid UPI ID format. Example: name@paytm" }); return;
    }
    try {
      const partner = await findPartnerForWithdrawal(type, code);
      if (!partner) { res.status(404).json({ error: "Partner not found" }); return; }
      if (partner.email !== email.toLowerCase().trim()) {
        res.status(403).json({ error: "Email does not match partner records" }); return;
      }
      if (type === "influencer") {
        await Influencer.updateOne({ coupon_code: code }, { upi_id: upi });
      } else if (type === "ambassador") {
        await Ambassador.updateOne({ referral_code: code }, { upi_id: upi });
      } else {
        await ReferralCode.updateOne({ referral_code: code }, { upi_id: upi });
      }
      res.json({ success: true, upiId: upi });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── Withdrawal: send OTP ──────────────────────────────────────────────────────
router.post(
  "/public/partner/withdrawal/send-otp",
  ipRateLimit(5, 60_000),
  async (req: Request, res: Response) => {
    const { type, code, email, amount } = req.body as { type?: string; code?: string; email?: string; amount?: number };
    if (!type || !code || !email || amount === undefined) {
      res.status(400).json({ error: "type, code, email and amount required" }); return;
    }
    const t = type.toLowerCase();
    const c = code.toUpperCase().trim();
    const e = email.toLowerCase().trim();
    const amt = Number(amount);
    if (!["influencer", "ambassador", "referral"].includes(t)) {
      res.status(400).json({ error: "Invalid type" }); return;
    }
    if (isNaN(amt) || amt < 500 || amt > 25000) {
      res.status(400).json({ error: "Amount must be between ₹500 and ₹25,000" }); return;
    }
    try {
      const partner = await findPartnerForWithdrawal(t, c);
      if (!partner) { res.status(404).json({ error: "Partner not found" }); return; }
      if (partner.email && partner.email !== e) { res.status(403).json({ error: "Email does not match our records" }); return; }
      if (amt > partner.withdrawable_balance) {
        res.status(400).json({ error: "Amount exceeds withdrawable balance" }); return;
      }
      const active = await Withdrawal.findOne({ partnerCode: c, partnerType: t, status: { $in: ["pending", "processing"] } });
      if (active) {
        res.status(409).json({ error: "You already have an active withdrawal request. Please wait for it to complete." }); return;
      }
      await OtpCode.updateMany({ email: e, storeId: `wd_${c}`, purpose: "partner-withdrawal", used: false }, { used: true });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await OtpCode.create({ email: e, storeId: `wd_${c}`, code: otp, purpose: "partner-withdrawal", expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
      await sendWithdrawalOtpEmail(e, otp, partner.name, amt);
      res.json({ success: true });
    } catch (err) {
      console.error("Withdrawal send-otp error:", err);
      res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
  }
);

// ── Withdrawal: verify OTP → session_token ────────────────────────────────────
router.post(
  "/public/partner/withdrawal/verify-otp",
  ipRateLimit(8, 60_000),
  async (req: Request, res: Response) => {
    const { type, code, email, otp } = req.body as { type?: string; code?: string; email?: string; otp?: string };
    if (!type || !code || !email || !otp) {
      res.status(400).json({ error: "type, code, email and otp required" }); return;
    }
    const t = type.toLowerCase();
    const c = code.toUpperCase().trim();
    const e = email.toLowerCase().trim();
    try {
      const record = await OtpCode.findOne({
        email: e, storeId: `wd_${c}`, code: otp.trim(),
        purpose: "partner-withdrawal", used: false, expiresAt: { $gt: new Date() },
      });
      if (!record) { res.status(400).json({ error: "Invalid or expired OTP. Please try again." }); return; }
      record.used = true;
      await record.save();
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const partner = await findPartnerForWithdrawal(t, c);
      _wdTokens.set(sessionToken, { type: t, code: c, email: e, name: partner?.name || "", expiresAt: Date.now() + 5 * 60 * 1000 });
      res.json({ success: true, session_token: sessionToken });
    } catch {
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

// ── Withdrawal: create request ────────────────────────────────────────────────
router.post(
  "/public/partner/withdrawal/request",
  ipRateLimit(3, 60_000),
  async (req: Request, res: Response) => {
    const { session_token, amount, upiId } = req.body as { session_token?: string; amount?: number; upiId?: string };
    if (!session_token || amount === undefined || !upiId) {
      res.status(400).json({ error: "session_token, amount and upiId required" }); return;
    }
    const session = _wdTokens.get(session_token);
    if (!session || Date.now() > session.expiresAt) {
      res.status(401).json({ error: "Session expired. Please verify OTP again." }); return;
    }
    const { type: t, code: c, email: e } = session;
    const amt = Number(amount);
    if (isNaN(amt) || amt < 500 || amt > 25000) {
      res.status(400).json({ error: "Amount must be between ₹500 and ₹25,000" }); return;
    }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId.trim())) {
      res.status(400).json({ error: "Invalid UPI ID" }); return;
    }
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
    const ua = String(req.headers["user-agent"] || "").slice(0, 300);
    try {
      const partner = await findPartnerForWithdrawal(t, c);
      if (!partner) { res.status(404).json({ error: "Partner not found" }); return; }
      if (amt > partner.withdrawable_balance) {
        res.status(400).json({ error: "Amount exceeds withdrawable balance" }); return;
      }
      const active = await Withdrawal.findOne({ partnerCode: c, partnerType: t, status: { $in: ["pending", "processing"] } });
      if (active) { res.status(409).json({ error: "Active withdrawal request already exists" }); return; }
      const requestId = `WD-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      await Withdrawal.create({ requestId, partnerType: t, partnerCode: c, partnerEmail: e, amount: amt, upiId: upiId.trim(), status: "pending", ipAddress: ip, userAgent: ua });
      if (t === "influencer") {
        await Influencer.updateOne({ coupon_code: c }, { $inc: { withdrawable_balance: -amt } });
      } else if (t === "ambassador") {
        await Ambassador.updateOne({ referral_code: c }, { $inc: { withdrawable_balance: -amt } });
      } else {
        await ReferralCode.updateOne({ referral_code: c }, { $inc: { withdrawable_balance: -amt } });
      }
      _wdTokens.delete(session_token);
      res.json({ success: true, requestId });
    } catch (err) {
      console.error("Withdrawal request error:", err);
      res.status(500).json({ error: "Failed to create withdrawal request" });
    }
  }
);

export default router;
