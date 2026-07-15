import { Router, Response } from "express";
import { requireSuperAdmin, AuthRequest } from "../middlewares/auth";
import { City } from "../models/City";
import { Store } from "../models/Store";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const router: Router = Router();

// GET /api/cities?state=Karnataka  — list cities, optionally filtered by state
router.get("/cities", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const filter = state ? { state } : {};
  const cities = await City.find(filter).sort({ state: 1, name: 1 }).lean();
  res.json(
    cities.map((c: any) => ({
      id: String(c._id),
      name: c.name,
      state: c.state,
      createdAt: c.createdAt,
    }))
  );
});

// GET /api/cities/counts-by-state — number of cities added under each state
router.get("/cities/counts-by-state", requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await City.aggregate([
    { $group: { _id: "$state", count: { $sum: 1 } } },
  ]);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r._id] = r.count;
  res.json(counts);
});

// GET /api/cities/store-counts — store count per registered city and state
router.get("/cities/store-counts", requireSuperAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [cities, stores] = await Promise.all([
      City.find({}).lean(),
      Store.find({}).select("address latitude longitude").lean(),
    ]);

    // Sort city list by name length descending (longer names match first, avoids "Pune" matching before "Navi Mumbai")
    const cityList = (cities as any[])
      .map((c) => ({
        id: String(c._id),
        name: c.name as string,
        state: c.state as string,
        nameLower: (c.name as string).toLowerCase(),
      }))
      .sort((a, b) => b.nameLower.length - a.nameLower.length);

    const byCityId: Record<string, number> = {};
    const byState: Record<string, number> = {};

    // Stores matched to a city (used to compute centroids for nearest-city fallback)
    const cityCoordsSum: Record<string, { sumLat: number; sumLon: number; n: number }> = {};
    const unmatched: { lat: number; lon: number }[] = [];

    for (const store of stores as any[]) {
      const addrLower = ((store.address as string) || "").toLowerCase();
      let matched: { id: string; state: string } | null = null;

      for (const city of cityList) {
        if (city.nameLower && addrLower.includes(city.nameLower)) {
          matched = { id: city.id, state: city.state };
          break;
        }
      }

      if (matched) {
        byCityId[matched.id] = (byCityId[matched.id] ?? 0) + 1;
        byState[matched.state] = (byState[matched.state] ?? 0) + 1;
        const lat = store.latitude as number | null;
        const lon = store.longitude as number | null;
        if (lat != null && lon != null && isFinite(lat) && isFinite(lon)) {
          if (!cityCoordsSum[matched.id]) cityCoordsSum[matched.id] = { sumLat: 0, sumLon: 0, n: 0 };
          cityCoordsSum[matched.id].sumLat += lat;
          cityCoordsSum[matched.id].sumLon += lon;
          cityCoordsSum[matched.id].n++;
        }
      } else {
        const lat = store.latitude as number | null;
        const lon = store.longitude as number | null;
        if (lat != null && lon != null && isFinite(lat) && isFinite(lon)) {
          unmatched.push({ lat, lon });
        }
      }
    }

    // Nearest-city fallback: assign unmatched stores to nearest city centroid
    if (unmatched.length > 0 && Object.keys(cityCoordsSum).length > 0) {
      const centroids = cityList
        .filter((c) => cityCoordsSum[c.id])
        .map((c) => ({
          id: c.id,
          state: c.state,
          lat: cityCoordsSum[c.id].sumLat / cityCoordsSum[c.id].n,
          lon: cityCoordsSum[c.id].sumLon / cityCoordsSum[c.id].n,
        }));

      for (const s of unmatched) {
        let nearestDist = Infinity;
        let nearestCity: { id: string; state: string } | null = null;
        for (const c of centroids) {
          const d = haversineKm(s.lat, s.lon, c.lat, c.lon);
          if (d < nearestDist) { nearestDist = d; nearestCity = c; }
        }
        if (nearestCity) {
          byCityId[nearestCity.id] = (byCityId[nearestCity.id] ?? 0) + 1;
          byState[nearestCity.state] = (byState[nearestCity.state] ?? 0) + 1;
        }
      }
    }

    res.json({
      byCity: byCityId,
      byState,
      totalCitiesWithStores: Object.keys(byCityId).length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute store counts" });
  }
});

// POST /api/cities { name, state } — add a new city under a state
router.post("/cities", requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, state } = req.body as { name?: string; state?: string };
  if (!name?.trim() || !state?.trim()) {
    res.status(400).json({ error: "City name and state are both required" });
    return;
  }

  const existing = await City.findOne({ state: state.trim(), name: name.trim() }).lean();
  if (existing) {
    res.status(409).json({ error: "This city already exists under the selected state" });
    return;
  }

  const city = await City.create({ name: name.trim(), state: state.trim() });
  res.status(201).json({ id: String(city._id), name: city.name, state: city.state, createdAt: city.createdAt });
});

export default router;
