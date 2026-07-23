import { Router, Request, Response, NextFunction } from "express";
import { Store } from "../models/Store";
import { User } from "../models/User";
import { Review } from "../models/Review";
import { MarketingCategoryConfig } from "../models/MarketingCategoryConfig";
import { DynamicPricing } from "../models/DynamicPricing";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse price string like "₹999" or "999.00" to a number. */
function parsePlanPrice(priceStr: any): number {
  if (priceStr === undefined || priceStr === null || priceStr === "") return 0;
  if (typeof priceStr === "number") return isNaN(priceStr) ? 0 : priceStr;
  const cleaned = String(priceStr).replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Haversine distance between two lat/lng pairs, in kilometres.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate the normalised 30-day value of a plan.
 *
 * Formula: (planPrice / durationDays) × 30
 *
 * Lifetime plans (durationDays = null) use LIFETIME_DAYS_EQUIV.
 * The lifetime equivalent is set to 3650 days (10 years) — a conservative,
 * industry-standard normalisation that can be tuned per-plan later.
 */
export const LIFETIME_DAYS_EQUIV = 3650;

export function calculate30DayPlanValue(
  planPrice: number,
  durationDays: number | null
): number {
  if (planPrice <= 0) return 0;
  const days = durationDays ?? LIFETIME_DAYS_EQUIV;
  if (days <= 0) return 0;
  return (planPrice / days) * 30;
}

/**
 * Composite ranking score in [0, 1].
 *
 * Weights:
 *   - Normalised 30-day plan value : 60 %
 *   - Proximity (closer = higher)  : 25 %
 *   - Average review rating        : 10 %
 *   - Review count (volume signal) :  5 %
 */
export function calculateStoreRankingScore(
  planValue30Day: number,
  maxPlanValue: number,
  distanceKm: number,
  radius: number,
  avgRating: number,
  reviewCount: number
): number {
  const planScore = maxPlanValue > 0 ? Math.min(planValue30Day / maxPlanValue, 1) : 0;
  const distScore = radius > 0 ? Math.max(0, 1 - distanceKm / radius) : 0;
  const ratingScore = avgRating / 5;
  const reviewScore = Math.min(reviewCount / 100, 1);
  return planScore * 0.6 + distScore * 0.25 + ratingScore * 0.1 + reviewScore * 0.05;
}

// ─── In-memory IP rate-limiter ────────────────────────────────────────────────

const _rl = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rl.entries()) {
    if (now > v.resetAt) _rl.delete(k);
  }
}, 10 * 60 * 1000);

function ipRateLimit(maxReqs: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const key = `disc::${req.path}::${ip}`;
    const now = Date.now();
    const rec = _rl.get(key);
    if (!rec || now > rec.resetAt) {
      _rl.set(key, { count: 1, resetAt: now + windowMs });
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

// ─── GET /api/public/store-discovery-categories ───────────────────────────────
//
// Returns only the "Store Category" strings created by the Super Admin
// under Revenue & Growth → Ads Engagement → Add Store Category.
// Never returns storeTypes.

router.get(
  "/public/store-discovery-categories",
  ipRateLimit(60, 60_000),
  async (_req: Request, res: Response) => {
    try {
      const config = await MarketingCategoryConfig.findById(
        "marketing-categories-v1"
      ).lean() as any;
      const categories: string[] = config?.categories ?? [];
      res.json({ categories });
    } catch {
      res.status(500).json({ error: "Failed to load categories" });
    }
  }
);

// ─── GET /api/public/stores/discover ─────────────────────────────────────────
//
// Query params:
//   lat       – user latitude  (optional; omit for nationwide listing)
//   lng       – user longitude (optional)
//   radius    – search radius in km (default 50, max 200)
//   category  – filter by Super Admin category name (empty = all)
//   search    – text search on store name / address / city
//   page      – page number (default 1)
//   limit     – page size (default 20, max 50)
//
// Response:
//   { stores: StoreCard[], total: number, hasMore: boolean }
//
// Security:
//   - Ranking is computed server-side; no score is exposed.
//   - No admin email / phone / plan pricing details are returned.
//   - isOpen is always false (structure is future-proof).

router.get(
  "/public/stores/discover",
  ipRateLimit(30, 60_000),
  async (req: Request, res: Response) => {
    try {
      const {
        lat,
        lng,
        radius: radiusRaw = "50",
        category = "",
        search = "",
        page: pageRaw = "1",
        limit: limitRaw = "20",
      } = req.query as Record<string, string>;

      const userLat = lat && lat !== "" ? parseFloat(lat) : null;
      const userLng = lng && lng !== "" ? parseFloat(lng) : null;
      const hasLocation =
        userLat !== null &&
        userLng !== null &&
        !isNaN(userLat) &&
        !isNaN(userLng);

      // No hard upper cap on radius — large values (e.g. 99999) are used by the
      // map-only fetch to retrieve ALL stores; normal list fetches use ≤50 km.
      const radius = Math.max(parseFloat(radiusRaw) || 50, 1);
      // Whether this is a "show everything on the map" request
      const isMapWide = radius > 5000;
      const page = Math.max(parseInt(pageRaw) || 1, 1);
      // Allow up to 500 results for map-wide fetches, otherwise cap at 50
      const maxLimit = isMapWide ? 500 : 50;
      const limit = Math.min(Math.max(parseInt(limitRaw) || 20, 1), maxLimit);
      const skip = (page - 1) * limit;

      // ── 1. Category → storeType mapping ──────────────────────────────────
      const categoryConfig = await MarketingCategoryConfig.findById(
        "marketing-categories-v1"
      ).lean() as any;
      const storeTypes: Array<{ name: string; category: string }> =
        categoryConfig?.storeTypes ?? [];

      let storeTypeFilter: string[] | null = null;
      const trimmedCategory = category.trim();
      if (trimmedCategory && trimmedCategory !== "all") {
        storeTypeFilter = storeTypes
          .filter((st) => st.category === trimmedCategory)
          .map((st) => st.name);
        if (storeTypeFilter.length === 0) {
          // Valid category but no store types assigned → empty result
          res.json({ stores: [], total: 0, hasMore: false });
          return;
        }
      }

      // ── 2. DynamicPricing plans (for 30-day value calc) ──────────────────
      const pricing = await DynamicPricing.findById("pricing-v2").lean() as any;
      const plans: Array<{
        _id: any;
        price: string;
        durationDays: number | null;
      }> = pricing?.plans ?? [];
      const planMap = new Map(
        plans.map((p) => [
          String(p._id),
          {
            price: parsePlanPrice(p.price),
            durationDays: p.durationDays ?? null,
          },
        ])
      );

      // ── 3. Eligible store owners ──────────────────────────────────────────
      const now = new Date();
      const userQuery: Record<string, any> = {
        role: "admin",
        isActive: true,
        $or: [
          { subscriptionEndDate: null },
          { subscriptionEndDate: { $gt: now } },
        ],
      };
      if (storeTypeFilter) {
        userQuery.storeType = { $in: storeTypeFilter };
      }

      const eligibleUsers = await User.find(userQuery)
        .select("_id planKey planPrice storeType")
        .lean();

      if (eligibleUsers.length === 0) {
        res.json({ stores: [], total: 0, hasMore: false });
        return;
      }

      const userIdToMeta = new Map(
        eligibleUsers.map((u: any) => [
          String(u._id),
          { planKey: u.planKey, planPrice: u.planPrice, storeType: u.storeType },
        ])
      );
      const ownerIds = eligibleUsers.map((u: any) => String(u._id));

      // ── 4. Find stores for those owners (with optional bounding box) ──────
      const storeQuery: Record<string, any> = {
        ownerId: { $in: ownerIds },
        latitude: { $exists: true, $ne: null, $type: "number" },
        longitude: { $exists: true, $ne: null, $type: "number" },
      };

      if (hasLocation && !isMapWide) {
        // Rough bounding-box pre-filter (DB-level) before exact Haversine.
        // Skipped for map-wide fetches (radius > 5000) so all stores are returned.
        const latDelta = radius / 111;
        const lngDelta =
          radius / (111 * Math.cos((userLat! * Math.PI) / 180));
        storeQuery.latitude = {
          $gte: userLat! - latDelta,
          $lte: userLat! + latDelta,
        };
        storeQuery.longitude = {
          $gte: userLng! - lngDelta,
          $lte: userLng! + lngDelta,
        };
      }

      if (search.trim()) {
        // Escape special regex chars to prevent ReDoS attacks
        const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        storeQuery.$or = [
          { name: { $regex: term, $options: "i" } },
          { address: { $regex: term, $options: "i" } },
        ];
      }

      const rawStores = await Store.find(storeQuery)
        .select(
          "_id name address latitude longitude bannerImage publicSlug ownerId"
        )
        .lean();

      if (rawStores.length === 0) {
        res.json({ stores: [], total: 0, hasMore: false });
        return;
      }

      // ── 5. Store-level review aggregates ─────────────────────────────────
      const storeIds = rawStores.map((s) => String(s._id));
      const reviewAgg = await Review.aggregate([
        { $match: { storeId: { $in: storeIds } } },
        {
          $group: {
            _id: "$storeId",
            avgRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      const reviewMap = new Map(
        reviewAgg.map((r) => [
          r._id as string,
          {
            avgRating: Math.round((r.avgRating as number) * 10) / 10,
            reviewCount: r.reviewCount as number,
          },
        ])
      );

      // ── 6. Build storeType → category lookup ─────────────────────────────
      const storeTypeToCategory = new Map(
        storeTypes.map((st) => [st.name, st.category])
      );

      // ── 7. Compute 30-day plan values → maxPlanValue for normalisation ────
      let maxPlanValue = 0;
      for (const u of eligibleUsers as any[]) {
        const plan = planMap.get(u.planKey);
        const price = plan ? plan.price : parsePlanPrice(u.planPrice);
        const durationDays = plan ? plan.durationDays : null;
        const val = calculate30DayPlanValue(price, durationDays);
        if (val > maxPlanValue) maxPlanValue = val;
      }

      // ── 8. Score + exact-radius filter ────────────────────────────────────
      type ScoredStore = {
        id: string;
        name: string;
        publicSlug: string;
        bannerImage: string | null;
        address: string | null;
        latitude: number;
        longitude: number;
        category: string;
        storeType: string;
        distance: number | null;
        avgRating: number;
        reviewCount: number;
        isOpen: boolean;
        _score: number;
      };

      const scoredStores: ScoredStore[] = [];

      for (const store of rawStores) {
        const lat2 = store.latitude as number;
        const lng2 = store.longitude as number;

        let distanceKm: number | null = null;
        if (hasLocation) {
          distanceKm = haversineKm(userLat!, userLng!, lat2, lng2);
          // For normal list fetches, drop stores outside the selected radius.
          // For map-wide fetches (isMapWide), keep ALL stores — the frontend
          // colours them green (within radius) or violet (outside) client-side.
          if (!isMapWide && distanceKm > radius) continue;
        }

        const meta = userIdToMeta.get(String(store.ownerId));
        if (!meta) continue;

        const ownerStoreType = meta.storeType || "";
        const ownerCategory =
          storeTypeToCategory.get(ownerStoreType) || ownerStoreType || "";

        const plan = planMap.get(meta.planKey);
        const planPrice = plan ? plan.price : parsePlanPrice(meta.planPrice);
        const durationDays = plan ? plan.durationDays : null;
        const planValue30Day = calculate30DayPlanValue(planPrice, durationDays);

        const reviewData = reviewMap.get(String(store._id));
        const avgRating = reviewData?.avgRating ?? 0;
        const reviewCount = reviewData?.reviewCount ?? 0;

        const score = calculateStoreRankingScore(
          planValue30Day,
          maxPlanValue,
          distanceKm ?? 0,
          radius,
          avgRating,
          reviewCount
        );

        scoredStores.push({
          id: String(store._id),
          name: store.name,
          publicSlug: store.publicSlug,
          bannerImage: store.bannerImage || null,
          address: store.address || null,
          latitude: lat2,
          longitude: lng2,
          category: ownerCategory,
          storeType: ownerStoreType,
          distance:
            distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
          avgRating,
          reviewCount,
          isOpen: false,
          _score: score,
        });
      }

      // ── 9. Sort by ranking score descending ───────────────────────────────
      scoredStores.sort((a, b) => b._score - a._score);

      const total = scoredStores.length;
      const paged = scoredStores.slice(skip, skip + limit);

      // Strip internal score — never expose to frontend
      const stores = paged.map(({ _score, ...rest }) => rest);

      res.json({ stores, total, hasMore: skip + limit < total });
    } catch (err) {
      (req as any).log?.error({ err }, "Store discovery error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
