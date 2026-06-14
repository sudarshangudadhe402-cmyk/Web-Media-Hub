import { Router } from "express";
import { AdminLegalAcceptance } from "../models/AdminLegalAcceptance";
import { requireAuth, requireSuperAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/legal/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role === "super_admin") {
      res.json({ required: false, completed: true });
      return;
    }
    const record = await AdminLegalAcceptance.findOne({ admin_id: String(user._id) });
    res.json({
      required: true,
      completed: !!(record?.final_acceptance),
    });
  } catch (err) {
    req.log.error({ err }, "Legal status error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (user.role === "super_admin") {
      res.status(403).json({ error: "Super admins do not require legal acceptance" });
      return;
    }

    const { device_type, browser_name } = req.body;

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "Unknown";

    const now = new Date();
    const accepted_date = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const accepted_time = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const record = await AdminLegalAcceptance.findOneAndUpdate(
      { admin_id: String(user._id) },
      {
        admin_id: String(user._id),
        admin_name: user.username,
        terms_accepted: true,
        privacy_accepted: true,
        refund_accepted: true,
        disclaimer_accepted: true,
        final_acceptance: true,
        accepted_date,
        accepted_time,
        accepted_timestamp: now,
        device_type: device_type || "Unknown",
        browser_name: browser_name || "Unknown",
        ip_address: ip,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, record });
  } catch (err) {
    req.log.error({ err }, "Legal accept error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/legal/acceptances", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { search, from, to } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === "string") {
      filter.admin_name = { $regex: search, $options: "i" };
    }

    if (from || to) {
      filter.accepted_timestamp = {};
      if (from) filter.accepted_timestamp.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        filter.accepted_timestamp.$lte = toDate;
      }
    }

    const records = await AdminLegalAcceptance.find(filter).sort({ accepted_timestamp: -1 });
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Legal acceptances list error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/legal/acceptances/export", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const records = await AdminLegalAcceptance.find({}).sort({ accepted_timestamp: -1 });

    const headers = [
      "Admin Name",
      "Admin ID",
      "Acceptance Date",
      "Acceptance Time",
      "Device Type",
      "Browser",
      "IP Address",
      "Terms",
      "Privacy",
      "Refund",
      "Disclaimer",
      "Final Acceptance",
    ];

    const rows = records.map((r) => [
      r.admin_name,
      r.admin_id,
      r.accepted_date,
      r.accepted_time,
      r.device_type,
      r.browser_name,
      r.ip_address,
      r.terms_accepted ? "Yes" : "No",
      r.privacy_accepted ? "Yes" : "No",
      r.refund_accepted ? "Yes" : "No",
      r.disclaimer_accepted ? "Yes" : "No",
      r.final_acceptance ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="legal-acceptances-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Legal export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
