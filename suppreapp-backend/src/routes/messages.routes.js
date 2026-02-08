import { Router } from "express";
import Conversation from "../models/Conversation.model.js";
import Message from "../models/Message.model.js";

const router = Router();

function same2(a, b, x, y) {
  const s1 = [String(a), String(b)].sort().join("|");
  const s2 = [String(x), String(y)].sort().join("|");
  return s1 === s2;
}

/**
 * POST /api/messages/dm/:userId
 * tạo hoặc lấy conversation DM giữa me và userId
 */
router.post("/dm/:userId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId;

    const convs = await Conversation.find({ type: "dm", memberIds: { $all: [meId, otherId] } })
      .sort({ updatedAt: -1 })
      .lean();

    const existed = convs.find((c) => c.memberIds?.length === 2 && same2(meId, otherId, c.memberIds[0], c.memberIds[1]));
    if (existed) return res.json({ conversationId: String(existed._id) });

    const created = await Conversation.create({ type: "dm", memberIds: [meId, otherId] });
    res.json({ conversationId: String(created._id) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/messages/:conversationId?limit=50&before=timestamp
 */
router.get("/:conversationId", async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const before = req.query.before ? new Date(String(req.query.before)) : null;

    const q = { conversationId };
    if (before) q.createdAt = { $lt: before };

    const items = await Message.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items: items.reverse() }); // trả theo thời gian tăng dần
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/messages/:conversationId
 * body: { text }
 */
router.post("/:conversationId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { conversationId } = req.params;
    const { text = "" } = req.body || {};

    const created = await Message.create({
      conversationId,
      senderId: meId,
      text: String(text || "").slice(0, 5000),
    });

    // update conversation summary
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
      lastMessageText: created.text,
    });

    res.json(created);
  } catch (e) {
    next(e);
  }
});

export default router;
