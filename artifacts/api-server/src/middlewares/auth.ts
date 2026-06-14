import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "wmh-secret-key-2024";

export interface AuthRequest extends Request {
  user?: IUser;
}

export function signToken(userId: string, sessionId: string): string {
  return jwt.sign({ id: userId, sessionId }, JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; sessionId?: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ error: "Account has been deactivated" });
      return;
    }

    if (decoded.sessionId && user.sessionId) {
      const sessionValid = decoded.sessionId === user.sessionId;
      if (!sessionValid) {
        const isSuperAdmin = user.role === "super_admin";
        const multiDeviceOk = user.role === "admin" && user.multiDeviceAllowed === true;
        if (isSuperAdmin || !multiDeviceOk) {
          res.status(401).json({ error: "Session expired — you have been logged in from another device" });
          return;
        }
      }
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "super_admin") {
      res.status(403).json({ error: "Super admin access required" });
      return;
    }
    next();
  });
}
