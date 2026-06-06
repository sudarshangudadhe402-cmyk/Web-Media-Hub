import app from "./app";
import { logger } from "./lib/logger";
import { connectDB, dbAvailable } from "./lib/mongodb";
import { User } from "./models/User";
import { Store } from "./models/Store";
import { Product } from "./models/Product";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
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
      await User.create({
        username: "Mr____Sid____55",
        password: "7666220521_SID",
        role: "super_admin",
      });
      logger.info("Default super admin created: Mr____Sid____55");
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
    logger.info(
      { deleted: result.deletedCount },
      "Cleaned up super-admin store products"
    );
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
