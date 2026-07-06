import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authRateLimiter } from "./middlewares/rateLimiter";

const app: Express = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.removeHeader("X-Powered-By");
  next();
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── CORS — restrict to known origins ────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin (no Origin header) and Replit proxy requests
      if (!origin) return callback(null, true);
      // Allow if explicitly listed
      if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Allow Replit dev domains (*.replit.dev, *.repl.co, *.replit.app)
      if (/\.(replit\.dev|repl\.co|replit\.app|janeway\.replit\.dev)$/.test(origin)) {
        return callback(null, true);
      }
      // Allow localhost in development
      if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// Raw body capture for Razorpay webhook HMAC verification.
// Must come BEFORE express.json() so the request stream isn't consumed twice.
app.use("/api/payments/razorpay-webhook", express.raw({ type: "*/*" }));

// Limit body size — 50 MB for 3D model uploads, 10 MB for image uploads, 1 MB for everything else
app.use((req: Request, res: Response, next: NextFunction) => {
  const isModelUpload = req.path.includes("/upload-model");
  const isImageUpload = req.path.includes("/upload-image");
  const limit = isModelUpload ? "50mb" : isImageUpload ? "10mb" : "1mb";
  express.json({ limit })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRateLimiter);
app.use("/api", router);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Don't expose internal error details to clients
  if (err.message?.startsWith("CORS")) {
    res.status(403).json({ error: "Forbidden: origin not allowed" });
    return;
  }
  (req as any).log?.error({ err }, "Unhandled route error");
  res.status(500).json({ error: "Internal server error" });
});
// ─────────────────────────────────────────────────────────────────────────────

export default app;
