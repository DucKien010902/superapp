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

function isAdminLike(m) {
  return m && (m.role === "owner" || m.role === "admin");
}

function mapGroupImage(img) {
  return {
    id: String(img?._id),
    url: img?.url || "",
    caption: img?.caption || "",
    createdBy: String(img?.createdBy || ""),
    createdAt: img?.createdAt || null,
  };
}

function mapGroupDocument(doc) {
  return {
    id: String(doc?._id),
    name: doc?.name || "",
    url: doc?.url || "",
    mimeType: doc?.mimeType || "",
    size: Number(doc?.size || 0),
    createdBy: String(doc?.createdBy || ""),
    createdAt: doc?.createdAt || null,
  };
}

function mapGroupPost(post) {
  return {
    id: String(post?._id),
    content: post?.content || "",
    createdBy: String(post?.createdBy || ""),
    createdAt: post?.createdAt || null,
    updatedAt: post?.updatedAt || null,
  };
}

function mapGroupBase(g, memberIds = [], myRole = "member") {
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
    memberIds,
    myRole,
    images: (g.images || []).map(mapGroupImage),
    documents: (g.documents || []).map(mapGroupDocument),
    posts: (g.posts || []).map(mapGroupPost),
  };
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

function ensureAdmin(req, res, next) {
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

    const members = await GroupMember.find({ groupId: { $in: groupIds } }).lean();
    const map = new Map();
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
      return mapGroupBase(g, extra.memberIds, extra.myRole || "member");
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const {
      name,
      description = "",
      visibility = "private",
      avatarUrl = "",
      coverUrl = "",
      images = [],
      documents = [],
      posts = [],
    } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const g = await Group.create({
      name: name.trim(),
      description,
      visibility,
      avatarUrl,
      coverUrl,
      ownerId: meId,
      isHidden: false,
      images: Array.isArray(images) ? images : [],
      documents: Array.isArray(documents) ? documents : [],
      posts: Array.isArray(posts) ? posts : [],
    });

    await GroupMember.create({ groupId: g._id, userId: meId, role: "owner" });
    res.json(mapGroupBase(g, [String(meId)], "owner"));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", ensureMember, async (req, res, next) => {
  try {
    const g = await Group.findById(req.groupId).lean();
    if (!g) return res.status(404).json({ message: "Not found" });

    const members = await GroupMember.find({ groupId: req.groupId }).lean();
    const memberIds = members.map((m) => String(m.userId));

    res.json(mapGroupBase(g, memberIds, req.meMember.role));
  } catch (e) {
    next(e);
  }
});

router.get("/:id/members", ensureMember, async (req, res, next) => {
  try {
    const rows = await GroupMember.find({ groupId: req.groupId })
      .sort({ role: 1, createdAt: 1 })
      .lean();

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

router.post("/:id/members", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const groupId = req.groupId;
    const { userId } = req.body || {};

    const uOid = oid(userId);
    if (!uOid) return res.status(400).json({ message: "Invalid userId" });
    if (String(uOid) === String(meId)) return res.status(400).json({ message: "Invalid userId" });

    const okFriend = await ensureFriendAccepted(meId, uOid);
    if (!okFriend) return res.status(403).json({ message: "Only can add accepted friends" });

    const created = await GroupMember.create({ groupId, userId: uOid, role: "member" });
    res.json({
      ok: true,
      item: { userId: String(created.userId), role: created.role, createdAt: created.createdAt },
    });
  } catch (e) {
    if (String(e?.code) === "11000") return res.json({ ok: true });
    next(e);
  }
});

router.patch("/:id", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const patch = {};
    const { name, description, avatarUrl, coverUrl, visibility, images, documents } = req.body || {};

    if (typeof name === "string" && name.trim()) patch.name = name.trim();
    if (typeof description === "string") patch.description = description;
    if (typeof avatarUrl === "string") patch.avatarUrl = avatarUrl;
    if (typeof coverUrl === "string") patch.coverUrl = coverUrl;
    if (visibility === "public" || visibility === "private") patch.visibility = visibility;

    if (Array.isArray(images)) {
      patch.images = images.map((item) => ({
        url: String(item?.url || ""),
        caption: String(item?.caption || ""),
        createdBy: item?.createdBy || req.user.id,
      }));
    }
    if (Array.isArray(documents)) {
      patch.documents = documents.map((item) => ({
        name: String(item?.name || ""),
        url: String(item?.url || ""),
        mimeType: String(item?.mimeType || ""),
        size: Number(item?.size || 0),
        createdBy: item?.createdBy || req.user.id,
      }));
    }

    const g = await Group.findByIdAndUpdate(req.groupId, patch, { new: true }).lean();
    if (!g) return res.status(404).json({ message: "Not found" });

    res.json({ ok: true, id: String(g._id) });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/members/:userId/role", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const { role } = req.body || {};
    if (role !== "owner" && role !== "admin" && role !== "member") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });

    if (role === "owner") {
      const ownerCount = await GroupMember.countDocuments({ groupId: req.groupId, role: "owner" });
      if (ownerCount >= 2 && target.role !== "owner") {
        return res.status(400).json({ message: "Max 2 owners in a group" });
      }
    }

    await GroupMember.updateOne({ groupId: req.groupId, userId: targetId }, { $set: { role } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/members/:userId", ensureMember, ensureAdmin, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });

    if (target.role === "owner") return res.status(400).json({ message: "Cannot remove owner" });
    if (req.meMember.role === "admin" && target.role === "admin") {
      return res.status(403).json({ message: "Admin cannot remove other admin" });
    }
    if (String(targetId) === String(meId) && req.meMember.role === "owner") {
      return res.status(400).json({ message: "Owner cannot leave. Transfer ownership first." });
    }

    await GroupMember.deleteOne({ groupId: req.groupId, userId: targetId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    await Promise.all([
      GroupMember.deleteMany({ groupId: req.groupId }),
      Group.deleteOne({ _id: req.groupId }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/:id/posts", ensureMember, async (req, res, next) => {
  try {
    const group = await Group.findById(req.groupId).lean();
    if (!group) return res.status(404).json({ message: "Not found" });

    const items = (group.posts || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .map(mapGroupPost);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/posts", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ message: "content is required" });

    const updated = await Group.findByIdAndUpdate(
      req.groupId,
      {
        $push: {
          posts: {
            content,
            createdBy: req.user.id,
          },
        },
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Not found" });
    const item = updated.posts?.[updated.posts.length - 1];
    res.json({ ok: true, item: mapGroupPost(item) });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/posts/:postId", ensureMember, async (req, res, next) => {
  try {
    if (req.meMember.role !== "owner") return res.status(403).json({ message: "Only owner" });

    const postId = oid(req.params.postId);
    if (!postId) return res.status(400).json({ message: "Invalid postId" });

    const content = String(req.body?.content || "").trim();
    if (!content) return res.status(400).json({ message: "content is required" });

    const group = await Group.findById(req.groupId);
    if (!group) return res.status(404).json({ message: "Not found" });

    const post = group.posts.id(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.content = content;
    await group.save();

    res.json({ ok: true, item: mapGroupPost(post) });
  } catch (e) {
    next(e);
  }
});

export default router;
