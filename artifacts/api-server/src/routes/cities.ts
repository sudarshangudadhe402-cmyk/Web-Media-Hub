import { Router, Response } from "express";
import { requireSuperAdmin, AuthRequest } from "../middlewares/auth";
import { City } from "../models/City";

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
