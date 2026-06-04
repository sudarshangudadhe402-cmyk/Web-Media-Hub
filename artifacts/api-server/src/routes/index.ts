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
import { requireDb } from "../middlewares/dbCheck";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireDb);

router.use(authRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(bookingsRouter);
router.use(storeRouter);
router.use(adminsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(storeRequestsRouter);
router.use(publicRouter);

export default router;
