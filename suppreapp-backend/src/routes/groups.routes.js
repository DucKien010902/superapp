import { Router } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.model.js";
import GroupMember from "../models/GroupMember.model.js";
import GroupRelationshipTree from "../models/GroupRelationshipTree.model.js";
import User from "../models/User.model.js";
import { pickUserPublic } from "../utils/pickUserPublic.js";

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

function mapGroupBase(g, memberIds = [], myRole = "member", childCount = 0) {
  return {
    id: String(g._id),
    name: g.name,
    description: g.description || "",
    visibility: g.visibility,
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: String(g.ownerId),
    parentGroupId: g.parentGroupId ? String(g.parentGroupId) : "",
    childCount: Number(childCount || 0),
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

function mapRelationshipTreeSummary(tree) {
  const rootCount = (tree.nodes || []).filter((node) => !node.parentNodeId).length;
  return {
    id: String(tree._id),
    groupId: String(tree.groupId),
    name: tree.name || "Untitled",
    nodeCount: Array.isArray(tree.nodes) ? tree.nodes.length : 0,
    rootCount,
    createdBy: String(tree.createdBy || ""),
    createdAt: tree.createdAt || null,
    updatedAt: tree.updatedAt || null,
  };
}

function mapRelationshipTreeDetail(tree, userMap = new Map()) {
  return {
    ...mapRelationshipTreeSummary(tree),
    nodes: (tree.nodes || [])
      .slice()
      .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
      .map((node) => ({
        id: String(node._id),
        userId: String(node.userId || ""),
        parentNodeId: node.parentNodeId ? String(node.parentNodeId) : "",
        orderIndex: Number(node.orderIndex || 0),
        user: pickUserPublic(userMap.get(String(node.userId))) || null,
      })),
  };
}

async function loadRelationshipTree(req, res, next) {
  const treeId = oid(req.params.treeId);
  if (!treeId) return res.status(400).json({ message: "Invalid tree id" });

  const tree = await GroupRelationshipTree.findOne({
    _id: treeId,
    groupId: req.groupId,
  });
  if (!tree) return res.status(404).json({ message: "Relationship tree not found" });

  req.relationshipTreeId = treeId;
  req.relationshipTree = tree;
  next();
}

async function buildChildCountMap(groupIds) {
  if (!groupIds.length) return new Map();
  const rows = await Group.aggregate([
    { $match: { parentGroupId: { $in: groupIds }, isHidden: { $ne: true } } },
    { $group: { _id: "$parentGroupId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), Number(row.count || 0)]));
}

async function loadGroup(req, res, next) {
  const groupId = req.params.id;
  const gOid = oid(groupId);
  if (!gOid) return res.status(400).json({ message: "Invalid group id" });

  const group = await Group.findById(gOid).lean();
  if (!group) return res.status(404).json({ message: "Not found" });

  req.groupId = gOid;
  req.group = group;
  next();
}

router.get("/", async (req, res, next) => {
  try {
    const parentIdRaw = String(req.query.parentId || "").trim();
    const parentId = parentIdRaw ? oid(parentIdRaw) : null;
    if (parentIdRaw && !parentId) return res.status(400).json({ message: "Invalid parentId" });

    const rootFilter = parentId
      ? { parentGroupId: parentId }
      : {
          $or: [{ parentGroupId: null }, { parentGroupId: { $exists: false } }],
        };

    const groups = await Group.find({
      isHidden: { $ne: true },
      ...rootFilter,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const visibleIds = groups.map((g) => g._id);
    const members = visibleIds.length
      ? await GroupMember.find({ groupId: { $in: visibleIds } }).lean()
      : [];
    const childCountMap = await buildChildCountMap(visibleIds);

    const map = new Map();
    for (const m of members) {
      const k = String(m.groupId);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(String(m.userId));
    }

    const items = groups.map((g) => {
      const memberIds = map.get(String(g._id)) || [];
      return mapGroupBase(
        g,
        memberIds,
        "owner",
        childCountMap.get(String(g._id)) || 0
      );
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
      parentGroupId = "",
    } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    let parentOid = null;

    if (String(parentGroupId || "").trim()) {
      parentOid = oid(parentGroupId);
      if (!parentOid) return res.status(400).json({ message: "Invalid parentGroupId" });

      const parentGroup = await Group.findById(parentOid).lean();
      if (!parentGroup) return res.status(404).json({ message: "Parent group not found" });

    }

    const g = await Group.create({
      name: name.trim(),
      description,
      visibility,
      avatarUrl,
      coverUrl,
      ownerId: meId,
      parentGroupId: parentOid,
      isHidden: false,
      images: Array.isArray(images) ? images : [],
      documents: Array.isArray(documents) ? documents : [],
      posts: Array.isArray(posts) ? posts : [],
    });

    res.json(mapGroupBase(g, [], "owner", 0));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", loadGroup, async (req, res, next) => {
  try {
    const members = await GroupMember.find({ groupId: req.groupId }).lean();
    const memberIds = members.map((m) => String(m.userId));
    const childCount = await Group.countDocuments({
      parentGroupId: req.groupId,
      isHidden: { $ne: true },
    });

    res.json(mapGroupBase(req.group, memberIds, "owner", childCount));
  } catch (e) {
    next(e);
  }
});

router.get("/:id/members", loadGroup, async (req, res, next) => {
  try {
    const rows = await GroupMember.find({ groupId: req.groupId })
      .sort({ role: 1, createdAt: 1 })
      .lean();

    const userIds = rows.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const items = rows.map((m) => ({
      userId: String(m.userId),
      role: m.role,
      isMuted: !!m.isMuted,
      createdAt: m.createdAt,
      user: pickUserPublic(userMap.get(String(m.userId))),
    }));

    res.json({ items, myRole: "owner" });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/members", loadGroup, async (req, res, next) => {
  try {
    const groupId = req.groupId;
    const { userId } = req.body || {};

    const uOid = oid(userId);
    if (!uOid) return res.status(400).json({ message: "Invalid userId" });

    const user = await User.findById(uOid).lean();
    if (!user || !user.isActive) return res.status(404).json({ message: "User not found" });

    if (req.group.parentGroupId) {
      const parentMembership = await GroupMember.findOne({
        groupId: req.group.parentGroupId,
        userId: uOid,
      }).lean();
      if (!parentMembership) {
        return res.status(400).json({ message: "User must belong to the parent group" });
      }
    }

    const created = await GroupMember.create({ groupId, userId: uOid, role: "member" });
    res.json({
      ok: true,
      item: {
        userId: String(created.userId),
        role: created.role,
        createdAt: created.createdAt,
        user: pickUserPublic(user),
      },
    });
  } catch (e) {
    if (String(e?.code) === "11000") return res.json({ ok: true });
    next(e);
  }
});

router.patch("/:id", loadGroup, async (req, res, next) => {
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

router.patch("/:id/members/:userId/role", loadGroup, async (req, res, next) => {
  try {
    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const { role } = req.body || {};
    if (role !== "owner" && role !== "admin" && role !== "member") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });

    await GroupMember.updateOne({ groupId: req.groupId, userId: targetId }, { $set: { role } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/members/:userId", loadGroup, async (req, res, next) => {
  try {
    const targetId = oid(req.params.userId);
    if (!targetId) return res.status(400).json({ message: "Invalid userId" });

    const target = await GroupMember.findOne({ groupId: req.groupId, userId: targetId }).lean();
    if (!target) return res.status(404).json({ message: "Member not found" });

    await GroupMember.deleteOne({ groupId: req.groupId, userId: targetId });

    const trees = await GroupRelationshipTree.find({ groupId: req.groupId });
    for (const tree of trees) {
      const removedNodeIds = new Set(
        (tree.nodes || [])
          .filter((node) => String(node.userId) === String(targetId))
          .map((node) => String(node._id))
      );
      if (!removedNodeIds.size) continue;

      let changed = true;
      while (changed) {
        changed = false;
        for (const node of tree.nodes || []) {
          if (
            node.parentNodeId &&
            removedNodeIds.has(String(node.parentNodeId)) &&
            !removedNodeIds.has(String(node._id))
          ) {
            removedNodeIds.add(String(node._id));
            changed = true;
          }
        }
      }

      tree.nodes = (tree.nodes || []).filter((node) => !removedNodeIds.has(String(node._id)));
      await tree.save();
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", loadGroup, async (req, res, next) => {
  try {
    const childCount = await Group.countDocuments({ parentGroupId: req.groupId, isHidden: { $ne: true } });
    if (childCount > 0) {
      return res.status(400).json({ message: "Delete child groups first" });
    }

    await Promise.all([
      GroupMember.deleteMany({ groupId: req.groupId }),
      GroupRelationshipTree.deleteMany({ groupId: req.groupId }),
      Group.deleteOne({ _id: req.groupId }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/:id/relationship-trees", loadGroup, async (req, res, next) => {
  try {
    const trees = await GroupRelationshipTree.find({ groupId: req.groupId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    res.json({ items: trees.map(mapRelationshipTreeSummary) });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/relationship-trees", loadGroup, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    const tree = await GroupRelationshipTree.create({
      groupId: req.groupId,
      name,
      createdBy: req.user.id,
      nodes: [],
    });

    res.json(mapRelationshipTreeSummary(tree));
  } catch (e) {
    next(e);
  }
});

router.get("/:id/relationship-trees/:treeId", loadGroup, loadRelationshipTree, async (req, res, next) => {
  try {
    const userIds = [...new Set((req.relationshipTree.nodes || []).map((node) => String(node.userId)))];
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).lean() : [];
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    res.json(mapRelationshipTreeDetail(req.relationshipTree.toObject(), userMap));
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/relationship-trees/:treeId", loadGroup, loadRelationshipTree, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    req.relationshipTree.name = name;
    await req.relationshipTree.save();

    res.json(mapRelationshipTreeSummary(req.relationshipTree.toObject()));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/relationship-trees/:treeId", loadGroup, loadRelationshipTree, async (req, res, next) => {
  try {
    await GroupRelationshipTree.deleteOne({ _id: req.relationshipTreeId, groupId: req.groupId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/relationship-trees/:treeId/nodes", loadGroup, loadRelationshipTree, async (req, res, next) => {
  try {
    const userId = oid(req.body?.userId);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const parentNodeIdRaw = String(req.body?.parentNodeId || "").trim();
    const parentNodeId = parentNodeIdRaw ? oid(parentNodeIdRaw) : null;
    if (parentNodeIdRaw && !parentNodeId) {
      return res.status(400).json({ message: "Invalid parentNodeId" });
    }

    const member = await GroupMember.findOne({ groupId: req.groupId, userId }).lean();
    if (!member) return res.status(400).json({ message: "User must belong to the group" });

    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) return res.status(404).json({ message: "User not found" });

    if ((req.relationshipTree.nodes || []).some((node) => String(node.userId) === String(userId))) {
      return res.status(400).json({ message: "User already exists in this tree" });
    }

    if (parentNodeId) {
      const parentExists = (req.relationshipTree.nodes || []).some(
        (node) => String(node._id) === String(parentNodeId)
      );
      if (!parentExists) return res.status(404).json({ message: "Parent node not found" });
    } else if ((req.relationshipTree.nodes || []).some((node) => !node.parentNodeId)) {
      return res.status(400).json({ message: "Root node already exists" });
    }

    const siblingCount = (req.relationshipTree.nodes || []).filter((node) =>
      parentNodeId
        ? String(node.parentNodeId || "") === String(parentNodeId)
        : !node.parentNodeId
    ).length;

    req.relationshipTree.nodes.push({
      userId,
      parentNodeId,
      orderIndex: siblingCount,
    });
    await req.relationshipTree.save();

    const fresh = await GroupRelationshipTree.findById(req.relationshipTreeId).lean();
    const userIds = [...new Set((fresh?.nodes || []).map((node) => String(node.userId)))];
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).lean() : [];
    const userMap = new Map(users.map((item) => [String(item._id), item]));

    res.json(mapRelationshipTreeDetail(fresh, userMap));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/relationship-trees/:treeId/nodes/:nodeId", loadGroup, loadRelationshipTree, async (req, res, next) => {
  try {
    const nodeId = oid(req.params.nodeId);
    if (!nodeId) return res.status(400).json({ message: "Invalid nodeId" });

    const target = (req.relationshipTree.nodes || []).find((node) => String(node._id) === String(nodeId));
    if (!target) return res.status(404).json({ message: "Node not found" });

    const removedNodeIds = new Set([String(nodeId)]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of req.relationshipTree.nodes || []) {
        if (
          node.parentNodeId &&
          removedNodeIds.has(String(node.parentNodeId)) &&
          !removedNodeIds.has(String(node._id))
        ) {
          removedNodeIds.add(String(node._id));
          changed = true;
        }
      }
    }

    req.relationshipTree.nodes = (req.relationshipTree.nodes || []).filter(
      (node) => !removedNodeIds.has(String(node._id))
    );
    await req.relationshipTree.save();

    const fresh = await GroupRelationshipTree.findById(req.relationshipTreeId).lean();
    const userIds = [...new Set((fresh?.nodes || []).map((node) => String(node.userId)))];
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).lean() : [];
    const userMap = new Map(users.map((item) => [String(item._id), item]));

    res.json(mapRelationshipTreeDetail(fresh, userMap));
  } catch (e) {
    next(e);
  }
});

router.get("/:id/posts", loadGroup, async (req, res, next) => {
  try {
    const items = (req.group.posts || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .map(mapGroupPost);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/posts", loadGroup, async (req, res, next) => {
  try {
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

router.patch("/:id/posts/:postId", loadGroup, async (req, res, next) => {
  try {
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
