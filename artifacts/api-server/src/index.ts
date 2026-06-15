import app from "./app";
import { logger } from "./lib/logger";
import { connectDB, dbAvailable } from "./lib/mongodb";
import { User } from "./models/User";
import { Store } from "./models/Store";
import { Product } from "./models/Product";

// ─── Global crash handlers — prevent silent server death ─────────────────────
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down safely");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — shutting down safely");
  process.exit(1);
});
// ─────────────────────────────────────────────────────────────────────────────

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedSuperAdmin() {
  if (!dbAvailable) return;
  try {
    const existing = await User.findOne({ role: "super_admin" });
    if (!existing) {
      // Read credentials from env — never hardcode in source
      const username = process.env.SEED_SUPER_ADMIN_USERNAME;
      const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
      if (!username || !password) {
        logger.warn("No super admin found and SEED_SUPER_ADMIN_USERNAME / SEED_SUPER_ADMIN_PASSWORD env vars not set — skipping seed");
        return;
      }
      await User.create({ username, password, plainPassword: password, role: "super_admin" });
      logger.info({ username }, "Default super admin created from env vars");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed super admin");
  }
}

async function cleanupSuperAdminProducts() {
  if (!dbAvailable) return;
  try {
    const superAdmin = await User.findOne({ role: "super_admin" });
    if (!superAdmin) return;

    const superAdminStore = await Store.findOne({ ownerId: String(superAdmin._id) });
    if (!superAdminStore) return;

    const storeId = String(superAdminStore._id);
    const count = await Product.countDocuments({ storeId });
    if (count === 0) return;

    const result = await Product.deleteMany({ storeId });
    logger.info({ deleted: result.deletedCount }, "Cleaned up super-admin store products");
  } catch (err) {
    logger.error({ err }, "Failed to cleanup super-admin products");
  }
}

async function start() {
  await connectDB();
  await seedSuperAdmin();
  await cleanupSuperAdminProducts();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    if (!dbAvailable) {
      logger.warn("Server running WITHOUT database. Add MONGODB_URI secret to enable full functionality.");
    }
  });
}

start();
