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
 * GET /api/users/:id
 * trả thêm "relationship" giữa me và user đó
 */
router.get("/:id", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id).lean();
    if (!target) return res.status(404).json({ message: "Not found" });

    // relationship
    const meId = req.user.id;
    const a = meId;
    const b = req.params.id;

    const rel =
      (await Friendship.findOne({ requesterId: a, addresseeId: b }).lean()) ||
      (await Friendship.findOne({ requesterId: b, addresseeId: a }).lean());

    // normalize
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

/**
 * GET /api/users?q=...
 * list user để search contacts
 */
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit || 50), 100);

    const filter = { isActive: true };
    if (q) {
      // search displayName/username/email/phone
      filter.$or = [
        { "profile.displayName": { $regex: q, $options: "i" } },
        { "profile.username": { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { "profile.phone": { $regex: q, $options: "i" } },
      ];
    }

    const items = await User.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items: items.map(pickUserPublic) });
  } catch (e) {
    next(e);
  }
});

export default router;
