import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

const _JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!_JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required");
}
// Non-null assertion is safe: we throw above if both are undefined
const JWT_SECRET: string = _JWT_SECRET;

export interface AuthRequest extends Request {
  user?: IUser;
}

export function signToken(userId: string, sessionId: string, role?: string): string {
  const expiresIn = role === "super_admin" ? "4h" : "7d";
  return jwt.sign({ id: userId, sessionId }, JWT_SECRET, { expiresIn, algorithm: "HS256" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as { id: string; sessionId?: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ error: "Authentication failed." });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ error: "Account has been deactivated" });
      return;
    }

    // All non-super-admin tokens must carry a sessionId so logout/revocation works.
    // Tokens without sessionId (e.g. legacy or externally minted) are rejected.
    if (user.role !== "super_admin") {
      if (!decoded.sessionId) {
        res.status(401).json({ error: "Invalid session — please log in again" });
        return;
      }
      const sessionExists = user.activeSessions.some((s) => s.sessionId === decoded.sessionId);
      if (!sessionExists) {
        res.status(401).json({ error: "Session expired — you have been logged in from another device" });
        return;
      }
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Like requireAuth but allows isActive=false accounts (for plan renewal flow) */
export async function requireAuthForRenewal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as { id: string; sessionId?: string };
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ error: "Authentication failed." });
      return;
    }
    if (user.role !== "super_admin") {
      if (!decoded.sessionId) {
        res.status(401).json({ error: "Invalid session — please log in again" });
        return;
      }
      const sessionExists = user.activeSessions.some((s) => s.sessionId === decoded.sessionId);
      if (!sessionExists) {
        res.status(401).json({ error: "Session expired" });
        return;
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
