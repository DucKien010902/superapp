// routes/users.routes.js
import { Router } from "express";
import User from "../models/User.model.js";
import Friendship from "../models/Friendship.model.js";
import { pickUserPublic } from "../utils/pickUserPublic.js";

const router = Router();

/**
 * GET /api/users/me
 */
router.get("/me", async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).lean();
    res.json({ user: pickUserPublic(me) });
  } catch (e) {
    next(e);
  }
});

/**
 * ✅ PATCH /api/users/me
 * update profile của chính mình
 */
router.patch("/me", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const payload = req.body || {};
    const p = payload.profile || {};

    // sanitize nhỏ để tránh undefined
    const set = {};

    // các field string
    const str = (v) => (typeof v === "string" ? v : "");
    const optStr = (v) => (typeof v === "string" ? v : undefined);

    if ("displayName" in p) set["profile.displayName"] = str(p.displayName).trim();
    if ("username" in p) set["profile.username"] = str(p.username).trim();
    if ("bio" in p) set["profile.bio"] = str(p.bio);
    if ("birthday" in p) set["profile.birthday"] = str(p.birthday);
    if ("phone" in p) set["profile.phone"] = str(p.phone);

    // enum gender
    if ("gender" in p) {
      const g = str(p.gender);
      const ok = ["male", "female", "other", ""].includes(g) ? g : "";
      set["profile.gender"] = ok;
    }

    if ("work" in p) set["profile.work"] = str(p.work);
    if ("education" in p) set["profile.education"] = str(p.education);

    // location
    if (p.location && typeof p.location === "object") {
      if ("city" in p.location) set["profile.location.city"] = str(p.location.city);
      if ("country" in p.location) set["profile.location.country"] = str(p.location.country);
    }

    // ảnh
    if ("avatarUrl" in p) set["profile.avatarUrl"] = str(p.avatarUrl);
    if ("coverUrl" in p) set["profile.coverUrl"] = str(p.coverUrl);

    // links (optional)
    if (Array.isArray(p.links)) {
      set["profile.links"] = p.links.map((x) => ({
        label: typeof x?.label === "string" ? x.label : "",
        url: typeof x?.url === "string" ? x.url : "",
      }));
    }

    // validate tối thiểu
    if ("profile.displayName" in set && !set["profile.displayName"]) {
      return res.status(400).json({ message: "displayName is required" });
    }

    const updated = await User.findByIdAndUpdate(
      meId,
      { $set: set },
      { new: true }
    ).lean();

    res.json({ user: pickUserPublic(updated) });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users/:id
 * ...
 */
router.get("/:id", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).lean();
    if (!target) return res.status(404).json({ message: "Not found" });

    const meId = req.user.id;
    const a = meId;
    const b = req.params.id;

    const rel =
      (await Friendship.findOne({ requesterId: a, addresseeId: b }).lean()) ||
      (await Friendship.findOne({ requesterId: b, addresseeId: a }).lean());

    let relationship = { status: "none", direction: "none" };
    if (rel) {
      const dir = String(rel.requesterId) === String(meId) ? "outgoing" : "incoming";
      relationship = { status: rel.status, direction: dir };
    }

    res.json({ user: pickUserPublic(target), relationship });
  } catch (e) {
    next(e);
  }
});

export default router;
