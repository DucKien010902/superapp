import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.model.js";
import Friendship from "../models/Friendship.model.js";

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

function normPhone(x) {
  const s = String(x || "").trim();
  if (!s) return "";
  // normalize đơn giản: bỏ khoảng trắng, dấu chấm, gạch
  return s.replace(/[^\d+]/g, "");
}

function pickUserPublic(u) {
  return {
    id: String(u._id),
    role: u.role,
    profile: u.profile,
    phone: u.phone,
    createdAt: u.createdAt,
  };
}

/**
 * POST /api/admin/create-friend
 * body: { displayName, phone, username? }
 * -> tạo user mới (password 777777) + tạo friendship accepted giữa admin và user mới
 */
router.post("/create-friend", requireAdmin, async (req, res, next) => {
  try {
    const meId = req.user.id;

    const displayName = String(req.body?.displayName || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const username = String(req.body?.username || "").trim();

    if (!displayName) {
      return res.status(400).json({ message: "displayName is required" });
    }
    if (!phone) {
      return res.status(400).json({ message: "phone is required" });
    }

    const phoneN = normPhone(phone);

    // check trùng theo phoneNormalized (unique sparse)
    const existed = await User.findOne({ phoneNormalized: phoneN }).lean();
    if (existed) {
      return res.status(409).json({ message: "Phone already exists" });
    }

    const passwordHash = await bcrypt.hash("777777", 10);

    const created = await User.create({
      email: "", // theo schema bạn đang để default
      phone,
      phoneNormalized: phoneN || undefined, // tránh "" gây dup key
      passwordHash,
      role: "user",
      isActive: true,
      profile: {
        username: username || undefined,
        displayName,
        avatarUrl: "",
        coverUrl: "",
        bio: "",
        gender: "",
        birthday: "",
        phone,
        location: { city: "", country: "" },
        work: "",
        education: "",
        links: [],
      },
      settings: {},
    });

    // tạo friendship accepted (nếu tồn tại thì update)
    const a = String(meId);
    const b = String(created._id);

    let fr = await Friendship.findOne({ requesterId: a, addresseeId: b });
    if (!fr) {
      fr = await Friendship.create({
        requesterId: a,
        addresseeId: b,
        status: "accepted",
      });
    } else {
      fr.status = "accepted";
      fr.blockedBy = null;
      await fr.save();
    }

    return res.json({ ok: true, user: pickUserPublic(created) });
  } catch (err) {
    return next(err);
  }
});
function pickProfilePatch(p = {}) {
  const out = {};
  const allow = [
    "username",
    "displayName",
    "avatarUrl",
    "coverUrl",
    "bio",
    "gender",
    "birthday",
    "phone",
    "work",
    "education",
    "links",
    "location",
  ];
  for (const k of allow) {
    if (typeof p[k] !== "undefined") out[k] = p[k];
  }
  // normalize location
  if (out.location) {
    out.location = {
      city: String(out.location.city || ""),
      country: String(out.location.country || ""),
    };
  }
  return out;
}

/**
 * PATCH /api/admin/users/:id
 * body: { profile: {...} }
 */
router.patch("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.params.id || "");
    const profilePatch = pickProfilePatch(req.body?.profile || {});

    if (Object.keys(profilePatch).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // displayName vẫn required theo schema
    if ("displayName" in profilePatch && !String(profilePatch.displayName || "").trim()) {
      return res.status(400).json({ message: "displayName is required" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { profile: { ...profilePatch } } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: String(updated._id),
        email: updated.email || "",
        role: updated.role,
        profile: updated.profile,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;