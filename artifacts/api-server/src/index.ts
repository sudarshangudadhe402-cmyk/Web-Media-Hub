import app from "./app";
import bcrypt from "bcryptjs";
import { logger } from "./lib/logger";
import { connectDB, dbAvailable } from "./lib/mongodb";
import { User } from "./models/User";
import { Store } from "./models/Store";
import { Product } from "./models/Product";
import { CustomerAccount } from "./models/CustomerAccount";
import { LoyaltyCard } from "./models/LoyaltyCard";

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
    const email = process.env.SEED_SUPER_ADMIN_EMAIL || "";
    if (!existing) {
      // Read credentials from env — never hardcode in source
      const username = process.env.SEED_SUPER_ADMIN_USERNAME;
      const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
      if (!username || !password) {
        logger.warn("No super admin found and SEED_SUPER_ADMIN_USERNAME / SEED_SUPER_ADMIN_PASSWORD env vars not set — skipping seed");
        return;
      }
      await User.create({ username, password, role: "super_admin", email });
      logger.info({ username, email }, "Default super admin created from env vars");
    } else if (email && existing.email !== email) {
      // Update email if env var is set and differs from stored value
      existing.email = email;
      await existing.save();
      logger.info({ email }, "Super admin email updated from env var");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed super admin");
  }
}

async function migratePasswordsToHash() {
  if (!dbAvailable) return;
  try {
    // Migrate CustomerAccount plain text passwords
    const customers = await CustomerAccount.find({});
    let customerMigrated = 0;
    for (const c of customers) {
      if (!c.password.startsWith("$2")) {
        const salt = await bcrypt.genSalt(12);
        c.password = await bcrypt.hash(c.password, salt);
        await CustomerAccount.updateOne({ _id: c._id }, { password: c.password });
        customerMigrated++;
      }
    }
    if (customerMigrated > 0) {
      logger.info({ count: customerMigrated }, "Migrated CustomerAccount plain-text passwords to bcrypt");
    }

    // Migrate LoyaltyCard plain text passwords
    const cards = await LoyaltyCard.find({});
    let cardMigrated = 0;
    for (const lc of cards) {
      if (!lc.password.startsWith("$2")) {
        const salt = await bcrypt.genSalt(12);
        lc.password = await bcrypt.hash(lc.password, salt);
        await LoyaltyCard.updateOne({ _id: lc._id }, { password: lc.password });
        cardMigrated++;
      }
    }
    if (cardMigrated > 0) {
      logger.info({ count: cardMigrated }, "Migrated LoyaltyCard plain-text passwords to bcrypt");
    }

    // Migrate User (admin) passwords stored with 10 rounds — re-hash only truly plain text ones
    // (bcrypt hashes always start with $2, so we skip already-hashed ones)
    const users = await User.find({});
    let userMigrated = 0;
    for (const u of users) {
      if (!u.password.startsWith("$2")) {
        const salt = await bcrypt.genSalt(12);
        u.password = await bcrypt.hash(u.password, salt);
        await User.updateOne({ _id: u._id }, { password: u.password });
        userMigrated++;
      }
    }
    if (userMigrated > 0) {
      logger.info({ count: userMigrated }, "Migrated User plain-text passwords to bcrypt");
    }
  } catch (err) {
    logger.error({ err }, "Password migration error");
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

async function startSubscriptionExpiryJob() {
  if (!dbAvailable) return;
  const run = async () => {
    try {
      const now = new Date();
      const result = await User.updateMany(
        { role: "admin", isActive: true, subscriptionEndDate: { $lt: now, $ne: null } },
        { $set: { isActive: false, sessionId: null } }
      );
      if (result.modifiedCount > 0) {
        logger.info({ count: result.modifiedCount }, "Auto-deactivated expired subscriptions");
      }
    } catch (err) {
      logger.error({ err }, "Subscription expiry check error");
    }
  };
  // Run once on startup, then every hour
  await run();
  setInterval(run, 60 * 60 * 1000);
}

async function start() {
  await connectDB();
  await seedSuperAdmin();
  await migratePasswordsToHash();
  await cleanupSuperAdminProducts();
  startSubscriptionExpiryJob();

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
