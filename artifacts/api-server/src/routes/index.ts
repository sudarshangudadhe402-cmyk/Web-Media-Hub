import { Router, type IRouter, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import bookingsRouter from "./bookings";
import storeRouter from "./store";
import adminsRouter from "./admins";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import storeRequestsRouter from "./storeRequests";
import publicRouter from "./public";
import settingsRouter from "./settings";
import pricingRouter from "./pricing";
import legalRouter from "./legal";
import ledgerRouter from "./ledger";
import customerAccountsRouter from "./customerAccounts";
import marketingRouter from "./marketing";
import citiesRouter from "./cities";
import campaignsRouter from "./campaigns";
import paymentsRouter from "./payments";
import chatRouter from "./chat";
import { requireDb } from "../middlewares/dbCheck";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}

// Routes that are allowed even with an expired subscription.
// These are router-relative paths (no /api prefix) because this middleware
// runs inside the /api sub-router where req.path strips the /api prefix.
const SUBSCRIPTION_EXEMPT_PREFIXES = [
  "/auth",
  "/payments",
  "/public",
  "/pricing",
  "/legal",
  "/store-requests",
  "/health",
  "/settings",
];

async function subscriptionGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { next(); return; }

  const path = req.path;
  const isExempt = SUBSCRIPTION_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (isExempt) { next(); return; }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select("role subscriptionEndDate").lean();
    if (
      user &&
      (user as any).role === "admin" &&
      (user as any).subscriptionEndDate &&
      new Date((user as any).subscriptionEndDate) < new Date()
    ) {
      res.status(403).json({ error: "Subscription expired. Please renew your plan to continue.", code: "SUBSCRIPTION_EXPIRED" });
      return;
    }
  } catch {
    // If JWT is invalid, let individual routes handle it
  }
  next();
}

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireDb);

router.use(subscriptionGuard);

router.use(authRouter);
router.use(legalRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(bookingsRouter);
router.use(storeRouter);
router.use(adminsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(storeRequestsRouter);
router.use(publicRouter);
router.use(settingsRouter);
router.use(pricingRouter);
router.use(ledgerRouter);
router.use(customerAccountsRouter);
router.use(marketingRouter);
router.use(citiesRouter);
router.use(campaignsRouter);
router.use(paymentsRouter);
router.use(chatRouter);

export default router;
