import { Router, type IRouter } from "express";
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
import couponsRouter from "./coupons";
import loyaltyCardsRouter from "./loyaltyCards";
import legalRouter from "./legal";
import ledgerRouter from "./ledger";
import customerAccountsRouter from "./customerAccounts";
import marketingRouter from "./marketing";
import campaignsRouter from "./campaigns";
import paymentsRouter from "./payments";
import { requireDb } from "../middlewares/dbCheck";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireDb);

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
router.use(couponsRouter);
router.use(loyaltyCardsRouter);
router.use(ledgerRouter);
router.use(customerAccountsRouter);
router.use(marketingRouter);
router.use(campaignsRouter);
router.use(paymentsRouter);

export default router;
