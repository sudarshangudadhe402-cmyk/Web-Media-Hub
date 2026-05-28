import mongoose from "mongoose";
import { logger } from "./logger";

let isConnected = false;
export let dbAvailable = false;

export async function connectDB(): Promise<void> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    logger.warn("MONGODB_URI is not set. Database features will be unavailable until it is configured.");
    return;
  }

  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    dbAvailable = true;
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB. Database features will be unavailable.");
  }
}
