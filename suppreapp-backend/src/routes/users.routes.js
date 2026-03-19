// routes/users.routes.js
import { Router } from "express";
import User from "../models/User.model.js";
import Friendship from "../models/Friendship.model.js";
import { pickUserPublic } from "../utils/pickUserPublic.js";

const router = Router();
function normPhone(input = "") {
  // chỉ giữ số
  const digits = String(input).replace(/[^\d]/g, "");
  // bạn có thể tùy biến normalize kiểu VN:
  // - +84xxxx -> 0xxxx
  // - 84xxxx -> 0xxxx
  if (digits.startsWith("84") && digits.length >= 10) return "0" + digits.slice(2);
  if (digits.startsWith("0084") && digits.length >= 12) return "0" + digits.slice(4);
  return digits;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/users?q=...&limit=5&skip=0
 * Search toàn hệ thống theo:
 * - displayName (profile.displayName)
 * - username (profile.username)
 * - phone (profile.phone / phoneNormalized)
 *
 * Trả về items (UserPublic[])
 */
router.get("/", async (req, res, next) => {
  try {
    const meId = String(req.user?.id || "");
    const qRaw = String(req.query.q || "").trim();

    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10) || 20, 1), 50);
    const skip = Math.max(parseInt(req.query.skip || "0", 10) || 0, 0);

    if (!qRaw) return res.json({ items: [] });

    const q = qRaw.slice(0, 64); // tránh query quá dài
    const qPhone = normPhone(q);
    const isPhoneQuery = /^\d{3,}$/.test(qPhone); // >=3 số thì coi là search phone

    const qEsc = escapeRegex(q);
    const qRe = new RegExp(qEsc, "i");

    // phone: ưu tiên match prefix / exact hơn
    const phonePrefixRe = isPhoneQuery ? new RegExp("^" + escapeRegex(qPhone)) : null;

    // Match condition
    const or = [
      { "profile.displayName": { $regex: qRe } },
      { "profile.username": { $regex: qRe } },
      { "profile.phone": { $regex: qRe } },
    ];

    if (isPhoneQuery) {
      or.push({ phone: { $regex: qRe } });
      or.push({ phoneNormalized: { $regex: qRe } });
    }

    // Relevance scoring (đơn giản nhưng hiệu quả)
    // - phoneNormalized prefix: score 100
    // - phoneNormalized contains: score 70
    // - displayName startsWith: score 60
    // - username startsWith: score 50
    // - displayName contains: score 30
    // - username contains: score 20
    const pipeline = [
      {
        $match: {
          isActive: true,
          ...(meId ? { _id: { $ne: meId } } : {}),
          $or: or,
        },
      },
      {
        $addFields: {
          _displayName: { $ifNull: ["$profile.displayName", ""] },
          _username: { $ifNull: ["$profile.username", ""] },
          _phoneN: { $ifNull: ["$phoneNormalized", ""] },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              // phone scoring
              ...(isPhoneQuery
                ? [
                    {
                      $cond: [
                        { $regexMatch: { input: "$_phoneN", regex: phonePrefixRe } },
                        100,
                        0,
                      ],
                    },
                    {
                      $cond: [
                        { $regexMatch: { input: "$_phoneN", regex: new RegExp(escapeRegex(qPhone)) } },
                        70,
                        0,
                      ],
                    },
                  ]
                : []),

              // displayName startsWith / contains
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: "$_displayName",
                      regex: new RegExp("^" + qEsc, "i"),
                    },
                  },
                  60,
                  0,
                ],
              },
              {
                $cond: [{ $regexMatch: { input: "$_displayName", regex: qRe } }, 30, 0],
              },

              // username startsWith / contains
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: "$_username",
                      regex: new RegExp("^" + qEsc, "i"),
                    },
                  },
                  50,
                  0,
                ],
              },
              {
                $cond: [{ $regexMatch: { input: "$_username", regex: qRe } }, 20, 0],
              },
            ],
          },
        },
      },
      { $sort: { score: -1, updatedAt: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const docs = await User.aggregate(pipeline);

    res.json({ items: docs.map(pickUserPublic) });
  } catch (e) {
    next(e);
  }
});
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

    // --- BẮT ĐẦU ĐOẠN SỬA ---
    // 1. Lấy thông tin an toàn (Public)
    const safeUserData = pickUserPublic(target);

    // 2. Kẻ gác cổng: Nếu người đang gửi request có role là "admin"
    // thì nhét thêm cái bí mật "evaluation" vào cho họ xem
    if (req.user?.role === "admin") {
      safeUserData.evaluation = target.evaluation || {
        score: "", attitude: "", skill: "", general: [], detailed: []
      };
    }
    // --- KẾT THÚC ĐOẠN SỬA ---

    // Gửi trả về cho Frontend
    res.json({ user: safeUserData, relationship });
  } catch (e) {
    next(e);
  }
});

export default router;
