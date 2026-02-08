import { Router } from "express";
import Friendship from "../models/Friendship.model.js";
import User from "../models/User.model.js";
import { pickUserPublic } from "../utils/pickUserPublic.js";

const router = Router();

function normId(x) {
  return String(x);
}

/**
 * GET /api/friends
 * trả danh sách bạn bè accepted của me
 */
router.get("/", async (req, res, next) => {
  try {
    const meId = req.user.id;

    const rels = await Friendship.find({
      status: "accepted",
      $or: [{ requesterId: meId }, { addresseeId: meId }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const otherIds = rels.map((r) =>
      normId(r.requesterId) === normId(meId) ? r.addresseeId : r.requesterId
    );

    const users = await User.find({ _id: { $in: otherIds } }).lean();
    const map = new Map(users.map((u) => [normId(u._id), u]));

    const items = otherIds
      .map((id) => map.get(normId(id)))
      .filter(Boolean)
      .map(pickUserPublic);

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/friends/requests
 * incoming pending requests
 */
router.get("/requests", async (req, res, next) => {
  try {
    const meId = req.user.id;

    const rels = await Friendship.find({ addresseeId: meId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean();

    const requesterIds = rels.map((r) => r.requesterId);
    const users = await User.find({ _id: { $in: requesterIds } }).lean();
    const map = new Map(users.map((u) => [String(u._id), u]));

    const items = rels.map((r) => ({
      id: String(r._id),
      requester: pickUserPublic(map.get(String(r.requesterId))),
      createdAt: r.createdAt,
    }));

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/friends/request/:userId
 * gửi lời mời kết bạn
 */
router.post("/request/:userId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId;

    if (normId(meId) === normId(otherId)) {
      return res.status(400).json({ message: "Cannot friend yourself" });
    }

    // nếu đã có relationship hai chiều
    const existed =
      (await Friendship.findOne({ requesterId: meId, addresseeId: otherId })) ||
      (await Friendship.findOne({ requesterId: otherId, addresseeId: meId }));

    if (existed) {
      // nếu incoming pending thì accept luôn (giống fb)
      if (existed.status === "pending" && normId(existed.addresseeId) === normId(meId)) {
        existed.status = "accepted";
        await existed.save();
        return res.json({ ok: true, status: "accepted" });
      }
      return res.json({ ok: true, status: existed.status });
    }

    await Friendship.create({ requesterId: meId, addresseeId: otherId, status: "pending" });
    res.json({ ok: true, status: "pending" });
  } catch (e) {
    // duplicate key
    if (String(e?.code) === "11000") return res.json({ ok: true });
    next(e);
  }
});

/**
 * POST /api/friends/accept/:userId
 * me là addressee, accept request
 */
router.post("/accept/:userId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId;

    const rel = await Friendship.findOne({
      requesterId: otherId,
      addresseeId: meId,
      status: "pending",
    });

    if (!rel) return res.status(404).json({ message: "Request not found" });

    rel.status = "accepted";
    await rel.save();

    res.json({ ok: true, status: "accepted" });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/friends/cancel/:userId
 * nếu outgoing pending thì cancel
 * nếu accepted thì unfriend
 */
router.post("/cancel/:userId", async (req, res, next) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId;

    const rel =
      (await Friendship.findOne({ requesterId: meId, addresseeId: otherId })) ||
      (await Friendship.findOne({ requesterId: otherId, addresseeId: meId }));

    if (!rel) return res.json({ ok: true });

    // chỉ cho xóa nếu liên quan me
    if (normId(rel.requesterId) !== normId(meId) && normId(rel.addresseeId) !== normId(meId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Friendship.findByIdAndDelete(rel._id);
    res.json({ ok: true, status: "none" });
  } catch (e) {
    next(e);
  }
});

export default router;
