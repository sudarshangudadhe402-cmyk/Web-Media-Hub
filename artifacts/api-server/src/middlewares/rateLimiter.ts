import rateLimit from "express-rate-limit";

// No custom keyGenerator — express-rate-limit defaults to req.ip, which Express
// correctly derives from the trusted proxy chain (app.set("trust proxy", 1) in app.ts).
// Handles IPv4, IPv4-mapped IPv6, and native IPv6 correctly out of the box.

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please wait 15 minutes and try again." },
  skipSuccessfulRequests: false,
});

export const loginStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 1 minute and try again." },
  skipSuccessfulRequests: true,
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests from this IP. Please wait 10 minutes." },
  skipSuccessfulRequests: false,
});

export const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please wait a minute and try again." },
  skipSuccessfulRequests: false,
});
