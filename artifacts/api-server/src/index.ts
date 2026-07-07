import app from "./app";
import bcrypt from "bcryptjs";
import { logger } from "./lib/logger";
import { connectDB, dbAvailable } from "./lib/mongodb";
import { User } from "./models/User";
import { Store } from "./models/Store";
import { Product } from "./models/Product";
import { CustomerAccount } from "./models/CustomerAccount";
import { sendStoreDeactivatedEmail } from "./services/emailOtp";


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

const BCRYPT_MIN_ROUNDS = 12;

function getBcryptRounds(hash: string): number {
  const m = hash.match(/^\$2[aby]?\$(\d+)\$/);
  return m ? parseInt(m[1], 10) : 0;
}

async function migratePasswordsToHash() {
  if (!dbAvailable) return;
  try {
    // ── CustomerAccount ───────────────────────────────────────────────────────
    let customerMigrated = 0;
    let customerLowCost = 0;
    const customerCursor = CustomerAccount.find({}).cursor();
    for await (const c of customerCursor) {
      if (!c.password.startsWith("$2")) {
        const hash = await bcrypt.hash(c.password, BCRYPT_MIN_ROUNDS);
        await CustomerAccount.updateOne({ _id: c._id }, { $set: { password: hash } });
        customerMigrated++;
      } else if (getBcryptRounds(c.password) < BCRYPT_MIN_ROUNDS) {
        customerLowCost++;
      }
    }
    if (customerMigrated > 0)
      logger.info({ count: customerMigrated }, "Migrated CustomerAccount plain-text passwords to bcrypt");
    if (customerLowCost > 0)
      logger.warn({ count: customerLowCost }, "CustomerAccount: low-cost bcrypt hashes found — will upgrade lazily on next login");

    // ── User (admin/super_admin) ──────────────────────────────────────────────
    let userMigrated = 0;
    let userLowCost = 0;
    const userCursor = User.find({}).cursor();
    for await (const u of userCursor) {
      if (!u.password.startsWith("$2")) {
        const hash = await bcrypt.hash(u.password, BCRYPT_MIN_ROUNDS);
        await User.updateOne({ _id: u._id }, { $set: { password: hash } });
        userMigrated++;
      } else if (getBcryptRounds(u.password) < BCRYPT_MIN_ROUNDS) {
        userLowCost++;
      }
    }
    if (userMigrated > 0)
      logger.info({ count: userMigrated }, "Migrated User plain-text passwords to bcrypt");
    if (userLowCost > 0)
      logger.warn({ count: userLowCost }, "User: low-cost bcrypt hashes found — will upgrade lazily on next login");

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

async function startCustomerAccountCleanupJob() {
  if (!dbAvailable) return;
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      // Delete accounts where lastActivityAt (or createdAt for old records) is older than 45 days
      const result = await CustomerAccount.deleteMany({
        $or: [
          { lastActivityAt: { $lt: cutoff } },
          { lastActivityAt: { $exists: false }, createdAt: { $lt: cutoff } },
        ],
      });
      if (result.deletedCount > 0) {
        logger.info({ count: result.deletedCount }, "Auto-deleted inactive customer accounts (45-day rule)");
      }
    } catch (err) {
      logger.error({ err }, "Customer account cleanup error");
    }
  };
  // Run once on startup, then every 24 hours
  await run();
  setInterval(run, 24 * 60 * 60 * 1000);
}

async function startSubscriptionExpiryJob() {
  if (!dbAvailable) return;
  const run = async () => {
    try {
      const now = new Date();

      // Find users that are about to be deactivated — fetch before bulk update so we have their data
      const toDeactivate = await User.find({
        role: "admin",
        isActive: true,
        subscriptionEndDate: { $lt: now, $ne: null },
      }).lean();

      if (toDeactivate.length === 0) return;

      // Bulk deactivate
      await User.updateMany(
        { role: "admin", isActive: true, subscriptionEndDate: { $lt: now, $ne: null } },
        { $set: { isActive: false, activeSessions: [] } }
      );

      logger.info({ count: toDeactivate.length }, "Auto-deactivated expired subscriptions");

      // Send deactivation email to each — atomic claim via conditional update
      for (const u of toDeactivate) {
        if (!u.email) continue;

        // Atomically claim the "send email" right — only proceeds if expiredEmailSent is still false.
        // This prevents double-send if two server instances race (e.g., rolling restarts).
        const claimed = await User.updateOne(
          { _id: u._id, expiredEmailSent: { $ne: true } },
          { $set: { expiredEmailSent: true } }
        );
        if (claimed.modifiedCount === 0) continue; // another instance already claimed it

        // Fetch store name
        let storeName = "";
        try {
          const store = await Store.findOne({ ownerId: String(u._id) }).lean();
          storeName = (store as any)?.name ?? u.planName ?? "";
        } catch { /* non-fatal */ }

        // Send email — fire-and-forget
        sendStoreDeactivatedEmail({
          toEmail: u.email,
          storeName,
          planName: u.planName ?? "",
        }).catch((emailErr) => {
          logger.error({ err: emailErr, email: u.email }, "Failed to send deactivation email");
        });
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
  startCustomerAccountCleanupJob();

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
