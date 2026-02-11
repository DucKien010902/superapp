// routes/messages.routes.js
import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.model.js";
import Message from "../models/Message.model.js";
import Group from "../models/Group.model.js"; // ✅ thêm
import GroupMember from "../models/GroupMember.model.js";

const router = Router();

function same2(a, b, x, y) {
  const s1 = [String(a), String(b)].sort().join("|");
  const s2 = [String(x), String(y)].sort().join("|");
  return s1 === s2;
}

function normId(x) {
  return String(x || "");
}

/**
 * POST /api/messages/dm/:userId
 * tạo hoặc lấy conversation DM giữa me và userId
 */

router.post("/group/:groupId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    const g = await Group.findById(groupId).lean();
    if (!g) return res.status(404).json({ message: "Group not found" });

    // ✅ CHECK MEMBER THEO GroupMember
    const isMember = await GroupMember.exists({ groupId, userId: meId });
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    // ✅ lấy list member để snapshot / memberCount
    const members = await GroupMember.find({ groupId })
      .select("userId")
      .lean();

    const memberIds = members.map((m) => String(m.userId));

    let conv = await Conversation.findOne({ type: "group", groupId }).lean();

    if (!conv) {
      const created = await Conversation.create({
        type: "group",
        groupId,               // nên thống nhất kiểu (String hoặc ObjectId)
        memberIds,             // snapshot
        title: g.name || "",
        avatarUrl: g.avatarUrl || "",
      });

      return res.json({
        conversationId: String(created._id),
        group: {
          id: String(g._id),
          name: g.name || "Nhóm",
          avatarUrl: g.avatarUrl || "",
          memberCount: memberIds.length,
        },
      });
    }

    return res.json({
      conversationId: String(conv._id),
      group: {
        id: String(g._id),
        name: g.name || conv.title || "Nhóm",
        avatarUrl: g.avatarUrl || conv.avatarUrl || "",
        memberCount: memberIds.length,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/dm/:userId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId;

    const convs = await Conversation.find({
      type: "dm",
      memberIds: { $all: [meId, otherId] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const existed = convs.find(
      (c) =>
        c.memberIds?.length === 2 &&
        same2(meId, otherId, c.memberIds[0], c.memberIds[1])
    );
    if (existed) return res.json({ conversationId: String(existed._id) });

    const created = await Conversation.create({
      type: "dm",
      memberIds: [meId, otherId],
    });

    res.json({ conversationId: String(created._id) });
  } catch (e) {
    next(e);
  }
});

/**
 * ✅ POST /api/messages/group/:groupId
 * tạo hoặc lấy conversation chat nhóm theo groupId
 * (bảo vệ: chỉ member mới vào được)
 */


/**
 * GET /api/messages/:conversationId?limit=50&before=timestamp
 * ✅ populate senderId để FE hiển thị avatar/tên trong nhóm
 */
router.get("/:conversationId", async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const before = req.query.before ? new Date(String(req.query.before)) : null;

    const q = { conversationId };
    if (before) q.createdAt = { $lt: before };

    const items = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: "senderId",
        select: "name profile.displayName profile.avatarUrl avatarUrl avatar",
      })
      .lean();

    // trả theo thời gian tăng dần
    res.json({ items: items.reverse() });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/messages/:conversationId
 * body: { text }
 * ✅ chặn nếu me không thuộc memberIds
 */
router.post("/:conversationId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { conversationId } = req.params;
    const { text = "" } = req.body || {};

    const conv = await Conversation.findById(conversationId).lean();
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    const ok = (conv.memberIds || []).map(normId).includes(normId(meId));
    if (!ok) return res.status(403).json({ message: "Not a member of this conversation" });

    const created = await Message.create({
      conversationId,
      senderId: meId,
      text: String(text || "").slice(0, 5000),
    });

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
