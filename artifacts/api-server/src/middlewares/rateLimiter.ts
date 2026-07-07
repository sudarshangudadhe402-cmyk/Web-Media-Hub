import rateLimit from "express-rate-limit";

// Use Express-derived req.ip (respects `app.set("trust proxy", 1)` set in app.ts).
// Do NOT read x-forwarded-for directly — that header is client-controlled and trivially spoofed.
function getIp(req: any): string {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: getIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please wait 15 minutes and try again." },
  skipSuccessfulRequests: false,
});

export const loginStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 1 minute and try again." },
  skipSuccessfulRequests: true,
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: getIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests from this IP. Please wait 10 minutes." },
  skipSuccessfulRequests: false,
});

export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please wait a minute and try again." },
  skipSuccessfulRequests: false,
});
