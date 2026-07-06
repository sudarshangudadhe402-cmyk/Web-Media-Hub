import { Router } from "express";
import { GlobalSettings } from "../models/GlobalSettings";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

// ── Global Link ──────────────────────────────────────────────────────────────

router.get("/settings/global-link", requireAuth, async (_req, res) => {
  try {
    const s = await GlobalSettings.findById("global");
    res.json({ globalLink: s?.globalLink ?? null });
  } catch (err) {
    (_req as any).log?.error({ err }, "Get global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/global-link", requireSuperAdmin, async (req, res) => {
  try {
    const { globalLink } = req.body;
    const s = await GlobalSettings.findByIdAndUpdate(
      "global",
      { globalLink: globalLink || null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ globalLink: s.globalLink });
  } catch (err) {
    (req as any).log?.error({ err }, "Put global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/settings/global-link", requireSuperAdmin, async (req, res) => {
  try {
    await GlobalSettings.findByIdAndUpdate("global", { globalLink: null });
    res.json({ globalLink: null });
  } catch (err) {
    (req as any).log?.error({ err }, "Delete global link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
