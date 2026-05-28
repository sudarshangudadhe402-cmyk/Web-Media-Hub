import { Request, Response, NextFunction } from "express";
import { dbAvailable } from "../lib/mongodb";

export function requireDb(req: Request, res: Response, next: NextFunction): void {
  if (!dbAvailable) {
    res.status(503).json({
      error: "Database not connected. Please add your MONGODB_URI secret in the Replit Secrets tab to enable this feature.",
    });
    return;
  }
  next();
}
