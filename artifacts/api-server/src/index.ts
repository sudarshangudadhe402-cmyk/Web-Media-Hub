import app from "./app";
import { logger } from "./lib/logger";
import { connectDB, dbAvailable } from "./lib/mongodb";
import { User } from "./models/User";

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

async function start() {
  await connectDB();
  await seedSuperAdmin();

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
