import { Router } from "express";
import mongoose from "mongoose";
import { ChatConversation } from "../models/ChatConversation";
import { ChatMessage } from "../models/ChatMessage";
import { CustomerAccount } from "../models/CustomerAccount";
import { Store } from "../models/Store";
import { AuthRequest, requireAuth } from "../middlewares/auth";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function validateCustomer(storeSlug: string, customerId: string) {
  const store = await Store.findOne({ publicSlug: storeSlug }).lean();
  if (!store) return null;
  const storeId = String(store._id);
  const customer = await CustomerAccount.findOne({ _id: customerId, storeId }).lean();
  if (!customer) return null;
  return { store, storeId, customer };
}

function isWithinDeletionWindow(date: Date): boolean {
  return Date.now() - date.getTime() < 5 * 60 * 1000; // 5 minutes
}

// ── PUBLIC (Customer) Routes ──────────────────────────────────────────────────

/**
 * GET /public/chat/:storeSlug/init?customerId=xxx
 * Get or create the customer's conversation with this store.
 */
router.get("/public/chat/:storeSlug/init", async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const customerId = req.query.customerId as string;

    if (!customerId) {
      res.status(400).json({ error: "customerId required" });
      return;
    }

    const validated = await validateCustomer(storeSlug, customerId);
    if (!validated) {
      res.status(404).json({ error: "Customer or store not found" });
      return;
    }

    const { storeId, customer } = validated;

    // Upsert conversation
    const conv = await ChatConversation.findOneAndUpdate(
      { storeId, customerId },
      {
        $setOnInsert: {
          storeId,
          customerId,
          customerName: (customer as any).name,
          lastMessage: "",
          lastMessageAt: new Date(),
          adminUnread: 0,
          customerUnread: 0,
        },
      },
      { upsert: true, new: true }
    ).lean();

    res.json({
      conversationId: String(conv!._id),
      storeId,
      customerName: conv!.customerName,
      adminUnread: conv!.adminUnread,
      customerUnread: conv!.customerUnread,
    });
  } catch (err) {
    req.log?.error({ err }, "chat init error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /public/chat/:storeSlug/messages?customerId=xxx&conversationId=yyy
 * Get messages for the customer's conversation (newest first, capped at 100).
 * Also marks admin messages as read and resets customerUnread.
 */
router.get("/public/chat/:storeSlug/messages", async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const customerId = req.query.customerId as string;
    const conversationId = req.query.conversationId as string;

    if (!customerId || !conversationId) {
      res.status(400).json({ error: "customerId and conversationId required" });
      return;
    }

    // Bug 7: invalid ObjectId would throw CastError → 500; return 404 instead
    if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(customerId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const validated = await validateCustomer(storeSlug, customerId);
    if (!validated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { storeId } = validated;

    const conv = await ChatConversation.findOne({
      _id: conversationId,
      storeId,
      customerId,
    }).lean();
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messages = await ChatMessage.find({
      conversationId,
      deletedForCustomer: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Mark admin's messages as read (fire-and-forget)
    ChatMessage.updateMany(
      { conversationId, senderRole: "admin", readAt: null },
      { $set: { readAt: new Date() } }
    ).catch(() => {});

    // Reset customer unread
    ChatConversation.updateOne(
      { _id: conversationId },
      { $set: { customerUnread: 0 } }
    ).catch(() => {});

    res.json(
      messages.map((m) => ({
        id: String(m._id),
        text: m.text,
        senderRole: m.senderRole,
        readAt: m.readAt,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    req.log?.error({ err }, "customer get messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /public/chat/:storeSlug/message
 * Customer sends a message. Body: { customerId, conversationId, text }
 */
router.post("/public/chat/:storeSlug/message", async (req, res) => {
  try {
    const { storeSlug } = req.params;
    const { customerId, conversationId, text } = req.body;

    if (!customerId || !conversationId || !text?.trim()) {
      res.status(400).json({ error: "customerId, conversationId and text required" });
      return;
    }

    // Bug 7: invalid ObjectId would throw CastError → 500; return 404 instead
    if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(customerId)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (text.trim().length > 1000) {
      res.status(400).json({ error: "Message too long (max 1000 characters)" });
      return;
    }

    const validated = await validateCustomer(storeSlug, customerId);
    if (!validated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { storeId } = validated;

    const conv = await ChatConversation.findOne({ _id: conversationId, storeId, customerId });
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Rate limit: max 1 message per 2 seconds per conversation
    const twoSecsAgo = new Date(Date.now() - 2000);
    const recent = await ChatMessage.countDocuments({
      conversationId,
      senderRole: "customer",
      createdAt: { $gt: twoSecsAgo },
    });
    if (recent > 0) {
      res.status(429).json({ error: "Please wait a moment before sending another message" });
      return;
    }

    const trimmed = text.trim();
    const message = await ChatMessage.create({
      conversationId,
      storeId,
      text: trimmed,
      senderRole: "customer",
      senderId: customerId,
    });

    await ChatConversation.updateOne(
      { _id: conversationId },
      {
        $set: { lastMessage: trimmed, lastMessageAt: new Date() },
        $inc: { adminUnread: 1 },
      }
    );

    // Keep customer active
    CustomerAccount.updateOne(
      { _id: customerId },
      { $set: { lastActivityAt: new Date() } }
    ).catch(() => {});

    res.json({
      id: String(message._id),
      text: message.text,
      senderRole: message.senderRole,
      readAt: message.readAt,
      createdAt: message.createdAt,
    });
  } catch (err) {
    req.log?.error({ err }, "customer send message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /public/chat/:storeSlug/message/:messageId
 * Customer deletes a message. Body: { customerId, conversationId }
 * Delete for everyone (within 5 min) if customer is sender, otherwise delete for self only.
 */
router.delete("/public/chat/:storeSlug/message/:messageId", async (req, res) => {
  try {
    const { storeSlug, messageId } = req.params;
    const { customerId, conversationId } = req.body;

    if (!customerId || !conversationId) {
      res.status(400).json({ error: "customerId and conversationId required" });
      return;
    }

    // Bug 7: invalid ObjectId would throw CastError → 500; return 404 instead
    if (
      !mongoose.isValidObjectId(messageId) ||
      !mongoose.isValidObjectId(conversationId) ||
      !mongoose.isValidObjectId(customerId)
    ) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const validated = await validateCustomer(storeSlug, customerId);
    if (!validated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { storeId } = validated;

    const msg = await ChatMessage.findOne({ _id: messageId, conversationId, storeId });
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const canDeleteForAll =
      msg.senderRole === "customer" &&
      msg.senderId === customerId &&
      isWithinDeletionWindow(msg.createdAt as Date);

    if (canDeleteForAll) {
      await ChatMessage.updateOne(
        { _id: messageId },
        { $set: { deletedForAdmin: true, deletedForCustomer: true, text: "This message was deleted" } }
      );
      // Update conversation's lastMessage if this was the last visible message
      const latestVisible = await ChatMessage.findOne(
        { conversationId, storeId, deletedForAdmin: { $ne: true }, deletedForCustomer: { $ne: true } },
        { text: 1, createdAt: 1 }
      ).sort({ createdAt: -1 }).lean();
      await ChatConversation.updateOne(
        { _id: conversationId },
        { $set: {
          lastMessage: latestVisible?.text ?? "",
          ...(latestVisible ? { lastMessageAt: latestVisible.createdAt } : {}),
        }}
      );
    } else {
      await ChatMessage.updateOne({ _id: messageId }, { $set: { deletedForCustomer: true } });
    }

    res.json({ success: true, deletedForAll: canDeleteForAll });
  } catch (err) {
    req.log?.error({ err }, "customer delete message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── ADMIN Routes ──────────────────────────────────────────────────────────────

/**
 * GET /chat/conversations
 * Admin gets all conversations for their store, sorted by most recent.
 */
router.get("/chat/conversations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const store = await Store.findOne({ ownerId: userId }).lean();
    if (!store) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const storeId = String(store._id);
    const conversations = await ChatConversation.find({ storeId })
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean();

    res.json(
      conversations.map((c) => ({
        id: String(c._id),
        customerId: c.customerId,
        customerName: c.customerName,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        adminUnread: c.adminUnread,
        customerUnread: c.customerUnread,
      }))
    );
  } catch (err) {
    req.log?.error({ err }, "admin get conversations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /chat/messages/:conversationId
 * Admin gets messages for a conversation. Also marks customer messages as read.
 */
router.get("/chat/messages/:conversationId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const { conversationId } = req.params;

    // Bug 7: invalid ObjectId would throw CastError → 500; return 404 instead
    if (!mongoose.isValidObjectId(conversationId)) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const store = await Store.findOne({ ownerId: userId }).lean();
    if (!store) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const storeId = String(store._id);

    const conv = await ChatConversation.findOne({ _id: conversationId, storeId }).lean();
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messages = await ChatMessage.find({
      conversationId,
      deletedForAdmin: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Mark customer messages as read (fire-and-forget)
    ChatMessage.updateMany(
      { conversationId, senderRole: "customer", readAt: null },
      { $set: { readAt: new Date() } }
    ).catch(() => {});

    // Reset admin unread
    ChatConversation.updateOne(
      { _id: conversationId },
      { $set: { adminUnread: 0 } }
    ).catch(() => {});

    res.json(
      messages.map((m) => ({
        id: String(m._id),
        text: m.text,
        senderRole: m.senderRole,
        readAt: m.readAt,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    req.log?.error({ err }, "admin get messages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /chat/message
 * Admin sends a message. Body: { conversationId, text }
 */
router.post("/chat/message", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const { conversationId, text } = req.body;

    if (!conversationId || !text?.trim()) {
      res.status(400).json({ error: "conversationId and text required" });
      return;
    }

    if (text.trim().length > 1000) {
      res.status(400).json({ error: "Message too long (max 1000 characters)" });
      return;
    }

    const store = await Store.findOne({ ownerId: userId }).lean();
    if (!store) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const storeId = String(store._id);

    const conv = await ChatConversation.findOne({ _id: conversationId, storeId });
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Rate limit: max 1 message per 2 seconds per conversation
    const twoSecsAgo = new Date(Date.now() - 2000);
    const recent = await ChatMessage.countDocuments({
      conversationId,
      senderRole: "admin",
      createdAt: { $gt: twoSecsAgo },
    });
    if (recent > 0) {
      res.status(429).json({ error: "Please wait before sending another message" });
      return;
    }

    const trimmed = text.trim();
    const message = await ChatMessage.create({
      conversationId,
      storeId,
      text: trimmed,
      senderRole: "admin",
      senderId: userId,
    });

    await ChatConversation.updateOne(
      { _id: conversationId },
      {
        $set: { lastMessage: trimmed, lastMessageAt: new Date() },
        $inc: { customerUnread: 1 },
      }
    );

    res.json({
      id: String(message._id),
      text: message.text,
      senderRole: message.senderRole,
      readAt: message.readAt,
      createdAt: message.createdAt,
    });
  } catch (err) {
    req.log?.error({ err }, "admin send message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /chat/message/:messageId
 * Admin deletes a message. Body: { conversationId }
 * Delete for everyone (within 5 min) if admin is sender, otherwise delete for self only.
 */
router.delete("/chat/message/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = String(req.user!._id);
    const { messageId } = req.params;
    const { conversationId } = req.body;

    // Bug 7: invalid ObjectId would throw CastError → 500; return 404 instead
    if (!mongoose.isValidObjectId(messageId)) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    // Bug 8: verify conversationId is present and valid so we can confirm ownership
    if (conversationId && !mongoose.isValidObjectId(conversationId)) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const store = await Store.findOne({ ownerId: userId }).lean();
    if (!store) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const storeId = String(store._id);

    // Bug 8: include conversationId in the query when provided to verify the message
    // belongs to the conversation the admin is currently viewing
    const msgQuery: Record<string, unknown> = { _id: messageId, storeId };
    if (conversationId) msgQuery.conversationId = conversationId;
    const msg = await ChatMessage.findOne(msgQuery);
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const canDeleteForAll =
      msg.senderRole === "admin" &&
      msg.senderId === userId &&
      isWithinDeletionWindow(msg.createdAt as Date);

    if (canDeleteForAll) {
      await ChatMessage.updateOne(
        { _id: messageId },
        { $set: { deletedForAdmin: true, deletedForCustomer: true, text: "This message was deleted" } }
      );
      // Update conversation's lastMessage if this was the last visible message
      const conversationId = String(msg.conversationId);
      const latestVisible = await ChatMessage.findOne(
        { conversationId, storeId, deletedForAdmin: { $ne: true }, deletedForCustomer: { $ne: true } },
        { text: 1, createdAt: 1 }
      ).sort({ createdAt: -1 }).lean();
      await ChatConversation.updateOne(
        { _id: conversationId },
        { $set: {
          lastMessage: latestVisible?.text ?? "",
          ...(latestVisible ? { lastMessageAt: latestVisible.createdAt } : {}),
        }}
      );
    } else {
      await ChatMessage.updateOne({ _id: messageId }, { $set: { deletedForAdmin: true } });
    }

    res.json({ success: true, deletedForAll: canDeleteForAll });
  } catch (err) {
    req.log?.error({ err }, "admin delete message error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
