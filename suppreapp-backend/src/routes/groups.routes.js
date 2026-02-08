// routes/groups.routes.js
import { Router } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.model.js";
import GroupMember from "../models/GroupMember.model.js";
import Friendship from "../models/Friendship.model.js";

const router = Router();

function oid(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

async function getMyMembership(groupId, meId) {
  return GroupMember.findOne({ groupId, userId: meId }).lean();
}

function isAdminLike(m) {
  return m && (m.role === "owner" || m.role === "admin");
}

async function ensureMember(req, res, next) {
  const meId = req.user.id;
  const groupId = req.params.id;
  const gOid = oid(groupId);
  if (!gOid) return res.status(400).json({ message: "Invalid group id" });

  const m = await GroupMember.findOne({ groupId: gOid, userId: meId }).lean();
  if (!m) return res.status(403).json({ message: "You are not a member of this group" });

  req.groupId = gOid;
  req.meMember = m;
  next();
}

async function ensureAdmin(req, res, next) {
  if (!isAdminLike(req.meMember)) return res.status(403).json({ message: "Forbidden" });
  next();
}

async function ensureFriendAccepted(meId, otherId) {
  const rel = await Friendship.findOne({
    $or: [
      { requesterId: meId, addresseeId: otherId, status: "accepted" },
      { requesterId: otherId, addresseeId: meId, status: "accepted" },
    ],
  }).lean();
  return !!rel;
}

// ===============
// GET /api/groups
// list nhóm mà user là member
// ===============
router.get("/", async (req, res, next) => {
  try {
    const meId = req.user.id;

    const memberships = await GroupMember.find({ userId: meId }).lean();
    const groupIds = memberships.map((m) => m.groupId);

    const groups = await Group.find({
      _id: { $in: groupIds },
      isHidden: { $ne: true },
    })
      .sort({ updatedAt: -1 })
      .lean();

    // build memberIds + myRole cho frontend
    const members = await GroupMember.find({ groupId: { $in: groupIds } }).lean();
    const map = new Map(); // groupId -> { memberIds: [], myRole }
    for (const m of members) {
      const k = String(m.groupId);
      if (!map.has(k)) map.set(k, { memberIds: [], myRole: null });
      map.get(k).memberIds.push(String(m.userId));
    }
    for (const my of memberships) {
      const k = String(my.groupId);
      if (!map.has(k)) map.set(k, { memberIds: [], myRole: my.role });
      map.get(k).myRole = my.role;
    }

    const items = groups.map((g) => {
      const extra = map.get(String(g._id)) || { memberIds: [], myRole: "member" };
      return {
        id: String(g._id),
        name: g.name,
        description: g.description || "",
        visibility: g.visibility,
        avatarUrl: g.avatarUrl || "",
        coverUrl: g.coverUrl || "",
        ownerId: String(g.ownerId),
        isHidden: !!g.isHidden,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        memberIds: extra.memberIds,
        myRole: extra.myRole || "member",
      };
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// ===============
// POST /api/groups
// tạo nhóm: creator là owner + auto member owner
// ===============
router.post("/", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { name, description = "", visibility = "private", avatarUrl = "", coverUrl = "" } =
      req.body || {};
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const g = await Group.create({
      name: name.trim(),
      description,
      visibility,
      avatarUrl,
      coverUrl,
      ownerId: meId,
      isHidden: false,
    });

    await GroupMember.create({ groupId: g._id, userId: meId, role: "owner" });

    res.json({
      id: String(g._id),
      name: g.name,
      description: g.description || "",
      visibility: g.visibility,
      avatarUrl: g.avatarUrl || "",
      coverUrl: g.coverUrl || "",
      ownerId: String(g.ownerId),
      isHidden: !!g.isHidden,
      memberIds: [String(meId)],
      myRole: "owner",
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    });
  } catch (e) {
    next(e);
  }
});

// ===============
// GET /api/groups/:id
// chỉ member mới xem được group detail
// ===============
router.get("/:id", ensureMember, async (req, res, next) => {
  try {
    const g = await Group.findById(req.groupId).lean();
    if (!g) return res.status(404).json({ message: "Not found" });

    const members = await GroupMember.find({ groupId: req.groupId }).lean();
    const memberIds = members.map((m) => String(m.userId));

    res.json({
      id: String(g._id),
      name: g.name,
      description: g.description || "",
      visibility: g.visibility,
      avatarUrl: g.avatarUrl || "",
      coverUrl: g.coverUrl || "",
      ownerId: String(g.ownerId),
      isHidden: !!g.isHidden,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      memberIds,
      myRole: req.meMember.role,
    });
  } catch (e) {
    next(e);
  }
});

// ===============
// GET /api/groups/:id/members
// list members (chỉ member mới xem)
// ===============
router.get("/:id/members", ensureMember, async (req, res, next) => {
  try {
    const rows = await GroupMember.find({ groupId: req.groupId })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    // trả “raw” userId + role; frontend map với friends (như bạn đang làm)
    const items = rows.map((m) => ({
      userId: String(m.userId),
      role: m.role,
      isMuted: !!m.isMuted,
      createdAt: m.createdAt,
    }));

    res.json({ items, myRole: req.meMember.role });
  } catch (e) {
    next(e);
  }
});

// ===============
// POST /api/groups/:id/members
// add member: chỉ owner/admin + chỉ add bạn bè accepted
// body: { userId }
// ===============
router.post("/:id/members", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const groupId = req.groupId;
    const { userId } = req.body || {};

    const uOid = oid(userId);
    if (!uOid) return res.status(400).json({ message: "Invalid userId" });

    // không add chính mình
    if (String(uOid) === String(meId)) return res.status(400).json({ message: "Invalid userId" });

    // chỉ add bạn bè accepted
    const okFriend = await ensureFriendAccepted(meId, uOid);
    if (!okFriend) return res.status(403).json({ message: "Only can add accepted friends" });

    const created = await GroupMember.create({ groupId, userId: uOid, role: "member" });
    res.json({
      ok: true,
      item: { userId: String(created.userId), role: created.role, createdAt: created.createdAt },
    });
  } catch (e) {
    if (String(e?.code) === "11000") return res.json({ ok: true }); // đã tồn tại
    next(e);
  }
});

// ===============
// PATCH /api/groups/:id
// update group info: owner/admin
// body: { name?, description?, avatarUrl?, coverUrl?, visibility? }
// ===============
router.patch("/:id", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const patch = {};
    const { name, description, avatarUrl, coverUrl, visibility } = req.body || {};

    if (typeof name === "string" && name.trim()) patch.name = name.trim();
    if (typeof description === "string") patch.description = description;
    if (typeof avatarUrl === "string") patch.avatarUrl = avatarUrl;
    if (typeof coverUrl === "string") patch.coverUrl = coverUrl;
    if (visibility === "public" || visibility === "private") patch.visibility = visibility;

    const g = await Group.findByIdAndUpdate(req.groupId, patch, { new: true }).lean();
    if (!g) return res.status(404).json({ message: "Not found" });

    res.json({ ok: true, id: String(g._id) });
  } catch (e) {
    next(e);
  }
});

// ===============
// PATCH /api/groups/:id/members/:userId/role
// đổi role: chỉ owner, không cho tự tiện đổi owner
// body: { role: "admin"|"member" }
// ===============
router.patch("/:id/members/:userId/role", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const { role } = req.body || {};
    if (role !== "admin" && role !== "member")
      return res.status(400).json({ message: "Invalid role" });

    // không cho đổi role của owner
    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });
    if (target.role === "owner") return res.status(400).json({ message: "Cannot change owner" });

    await GroupMember.updateOne({ groupId: req.groupId, userId: targetId }, { $set: { role } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ===============
// DELETE /api/groups/:id/members/:userId
// kick member: owner/admin (admin không kick owner/admin khác)
// ===============
router.delete("/:id/members/:userId", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });

    // không kick owner
    if (target.role === "owner") return res.status(400).json({ message: "Cannot remove owner" });

    // admin không kick admin khác
    if (req.meMember.role === "admin" && target.role === "admin")
      return res.status(403).json({ message: "Admin cannot remove other admin" });

    // cho phép tự rời nhóm (member/admin) bằng cách gọi xóa chính mình
    // nhưng owner không được tự rời
    if (String(targetId) === String(meId) && req.meMember.role === "owner") {
      return res.status(400).json({ message: "Owner cannot leave. Transfer ownership first." });
    }

    await GroupMember.deleteOne({ groupId: req.groupId, userId: targetId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ===============
// DELETE /api/groups/:id
// delete group: chỉ owner
// ===============
router.delete("/:id", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    await Promise.all([
      GroupMember.deleteMany({ groupId: req.groupId }),
      Group.deleteOne({ _id: req.groupId }),
      // (sau này có media/doc thì xóa kèm ở đây)
    ]);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
