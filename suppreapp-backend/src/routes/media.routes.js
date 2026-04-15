import { Router } from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";

import Group from "../models/Group.model.js";
import GroupMember from "../models/GroupMember.model.js";
import User from "../models/User.model.js";
import { buildPublicMinioUrl, getObjectNameFromPublicUrl, minioClient, MINIO_BUCKET } from "../minio.js";
import { pickUserPublic } from "../utils/pickUserPublic.js";

const router = Router();
const upload = multer({ dest: "temp/", limits: { fileSize: 100 * 1024 * 1024, files: 20 } });

function oid(id) {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
}

function slugify(value, fallback) {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

function safeFileName(name) {
  const ext = path.extname(name || "").slice(0, 16);
  const base = path.basename(name || "file", ext);
  const safeBase = slugify(base, "file");
  return `${Date.now()}_${safeBase}${ext.toLowerCase()}`;
}

function mediaFolder(kind) {
  if (kind === "avatar") return "avatar";
  if (kind === "cover") return "cover";
  if (kind === "image") return "images";
  return "files";
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

function mapGroup(g, myRole = "member", memberIds = []) {
  return {
    id: String(g._id),
    name: g.name,
    description: g.description || "",
    visibility: g.visibility,
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: String(g.ownerId),
    parentGroupId: g.parentGroupId ? String(g.parentGroupId) : "",
    childCount: Number(g.childCount || 0),
    isHidden: !!g.isHidden,
    memberIds,
    myRole,
    images: (g.images || []).map(mapGroupImage),
    documents: (g.documents || []).map(mapGroupDocument),
    posts: (g.posts || []).map((post) => ({
      id: String(post?._id),
      content: post?.content || "",
      createdBy: String(post?.createdBy || ""),
      createdAt: post?.createdAt || null,
      updatedAt: post?.updatedAt || null,
    })),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

async function mapGroupWithCounts(g, myRole = "member", memberIds = []) {
  const childCount = await Group.countDocuments({
    parentGroupId: g._id,
    isHidden: { $ne: true },
  });
  return {
    ...mapGroup(g, myRole, memberIds),
    childCount,
  };
}

async function removeMinioObjectByUrl(url) {
  const objectName = getObjectNameFromPublicUrl(url);
  if (!objectName) return;
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectName);
  } catch (error) {
    console.warn("MinIO removeObject failed:", objectName, error?.message || error);
  }
}

async function getUserTarget(req, ownerId) {
  const userId = String(ownerId || req.user.id);
  if (String(req.user.id) !== userId && req.user.role !== "admin") {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function getGroupTarget(req, ownerId, kind) {
  const groupId = oid(ownerId);
  if (!groupId) {
    const err = new Error("Invalid group id");
    err.statusCode = 400;
    throw err;
  }

  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error("Group not found");
    err.statusCode = 404;
    throw err;
  }

  return { group, membership: { role: "owner" } };
}

async function uploadOneFile(file, objectName) {
  await minioClient.fPutObject(MINIO_BUCKET, objectName, file.path, {
    "Content-Type": file.mimetype || "application/octet-stream",
  });
  return buildPublicMinioUrl(objectName);
}

router.get("/list", async (req, res, next) => {
  try {
    const scope = String(req.query.scope || "");
    const ownerId = String(req.query.ownerId || "");

    if (scope === "user") {
      const user = await getUserTarget(req, ownerId);
      return res.json({
        images: user.images || [],
        files: user.files || [],
        avatarUrl: user.profile?.avatarUrl || "",
        coverUrl: user.profile?.coverUrl || "",
        user: pickUserPublic(user),
      });
    }

    if (scope === "group") {
      const { group, membership } = await getGroupTarget(req, ownerId, "file");
      const members = await GroupMember.find({ groupId: group._id }).lean();
      return res.json({
        images: group.images || [],
        documents: group.documents || [],
        avatarUrl: group.avatarUrl || "",
        coverUrl: group.coverUrl || "",
        group: await mapGroupWithCounts(group, membership.role, members.map((m) => String(m.userId))),
      });
    }

    res.status(400).json({ message: "Invalid scope" });
  } catch (e) {
    next(e);
  }
});

router.post("/upload", upload.array("files", 20), async (req, res, next) => {
  const tempFiles = req.files || [];
  try {
    const scope = String(req.body?.scope || "");
    const kind = String(req.body?.kind || "");
    const ownerId = String(req.body?.ownerId || "");

    if (!["user", "group"].includes(scope)) return res.status(400).json({ message: "Invalid scope" });
    if (!["image", "file", "avatar", "cover"].includes(kind)) return res.status(400).json({ message: "Invalid kind" });
    if (tempFiles.length === 0) return res.status(400).json({ message: "No files uploaded" });
    if ((kind === "avatar" || kind === "cover") && tempFiles.length !== 1) {
      return res.status(400).json({ message: "Avatar/cover only accepts one file" });
    }

    if (scope === "user") {
      const user = await getUserTarget(req, ownerId);
      const ownerFolder = `${slugify(user.profile?.displayName || user.profile?.username, "user")}_${String(user._id)}`;
      const items = [];

      for (const file of tempFiles) {
        const objectName = `user/${ownerFolder}/${mediaFolder(kind)}/${safeFileName(file.originalname)}`;
        const url = await uploadOneFile(file, objectName);
        items.push({ name: file.originalname, url, mimeType: file.mimetype || "", size: Number(file.size || 0) });
      }

      if (kind === "avatar") {
        await removeMinioObjectByUrl(user.profile?.avatarUrl);
        user.profile.avatarUrl = items[0].url;
      } else if (kind === "cover") {
        await removeMinioObjectByUrl(user.profile?.coverUrl);
        user.profile.coverUrl = items[0].url;
      } else if (kind === "image") {
        user.images.push(...items.map((item) => ({ url: item.url, caption: "" })));
      } else {
        user.files.push(...items);
      }

      await user.save();
      return res.json({ success: true, items, user: pickUserPublic(user) });
    }

    const { group, membership } = await getGroupTarget(req, ownerId, kind);
    const ownerFolder = `${slugify(group.name, "group")}_${String(group._id)}`;
    const items = [];

    for (const file of tempFiles) {
      const objectName = `group/${ownerFolder}/${mediaFolder(kind)}/${safeFileName(file.originalname)}`;
      const url = await uploadOneFile(file, objectName);
      items.push({ name: file.originalname, url, mimeType: file.mimetype || "", size: Number(file.size || 0) });
    }

    if (kind === "avatar") {
      await removeMinioObjectByUrl(group.avatarUrl);
      group.avatarUrl = items[0].url;
    } else if (kind === "cover") {
      await removeMinioObjectByUrl(group.coverUrl);
      group.coverUrl = items[0].url;
    } else if (kind === "image") {
      group.images.push(...items.map((item) => ({ url: item.url, caption: "", createdBy: req.user.id })));
    } else {
      group.documents.push(
        ...items.map((item) => ({
          name: item.name,
          url: item.url,
          mimeType: item.mimeType,
          size: item.size,
          createdBy: req.user.id,
        }))
      );
    }

    await group.save();
    const members = await GroupMember.find({ groupId: group._id }).lean();
    return res.json({
      success: true,
      items,
      group: await mapGroupWithCounts(group, membership.role, members.map((m) => String(m.userId))),
    });
  } catch (e) {
    next(e);
  } finally {
    await Promise.all(tempFiles.map((file) => fs.unlink(file.path).catch(() => {})));
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const scope = String(req.body?.scope || "");
    const ownerId = String(req.body?.ownerId || "");
    const kind = String(req.body?.kind || "");
    const mediaId = String(req.body?.mediaId || "");

    if (!["user", "group"].includes(scope)) return res.status(400).json({ message: "Invalid scope" });
    if (!["image", "file", "avatar", "cover"].includes(kind)) return res.status(400).json({ message: "Invalid kind" });

    if (scope === "user") {
      const user = await getUserTarget(req, ownerId);
      let url = "";

      if (kind === "avatar") {
        url = user.profile?.avatarUrl || "";
        user.profile.avatarUrl = "";
      } else if (kind === "cover") {
        url = user.profile?.coverUrl || "";
        user.profile.coverUrl = "";
      } else {
        const arr = kind === "image" ? user.images : user.files;
        const item = arr.id(mediaId);
        if (!item) return res.status(404).json({ message: "Media not found" });
        url = item.url;
        item.deleteOne();
      }

      await removeMinioObjectByUrl(url);
      await user.save();
      return res.json({ success: true, user: pickUserPublic(user) });
    }

    const { group, membership } = await getGroupTarget(req, ownerId, kind);
    let url = "";

    if (kind === "avatar") {
      url = group.avatarUrl || "";
      group.avatarUrl = "";
    } else if (kind === "cover") {
      url = group.coverUrl || "";
      group.coverUrl = "";
    } else {
      const arr = kind === "image" ? group.images : group.documents;
      const item = arr.id(mediaId);
      if (!item) return res.status(404).json({ message: "Media not found" });
      url = item.url;
      item.deleteOne();
    }

    await removeMinioObjectByUrl(url);
    await group.save();
    const members = await GroupMember.find({ groupId: group._id }).lean();
    return res.json({
      success: true,
      group: await mapGroupWithCounts(group, membership.role, members.map((m) => String(m.userId))),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
