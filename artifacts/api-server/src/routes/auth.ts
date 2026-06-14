import { Router } from "express";
import { User } from "../models/User";
import { Store } from "../models/Store";
import { signToken, requireAuth, AuthRequest } from "../middlewares/auth";
import { requireDb } from "../middlewares/dbCheck";

const router = Router();

router.post("/auth/login", requireDb, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.role === "admin" && user.isActive === false) {
      res.status(403).json({ error: "Admin is currently not-active, please contact to super-admin" });
      return;
    }

    const token = signToken(String(user._id));
    res.json({
      token,
      user: {
        id: String(user._id),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireDb, requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  let storeName: string | null = null;
  if (user.role === "admin") {
    const store = await Store.findOne({ ownerId: String(user._id) }).select("name");
    storeName = store?.name ?? null;
  }
  res.json({
    id: String(user._id),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    storeName,
  });
});

router.patch("/auth/change-password", requireDb, requireAuth, async (req: AuthRequest, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (currentPassword) {
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
    }

    if (username) user.username = username;
    if (newPassword) user.password = newPassword;
    await user.save();

    res.json({
      id: String(user._id),
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Change password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
