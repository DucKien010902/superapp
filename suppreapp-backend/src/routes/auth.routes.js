import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// ✅ chuẩn hoá số VN: 0xxxxxxxxx -> 84xxxxxxxxx, bỏ ký tự không phải số
function normalizeVNPhone(input = "") {
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return "";

  // 0xxxxxxxxx (10 số) => 84xxxxxxxxx
  if (digits.startsWith("0")) return "84" + digits.slice(1);

  // 84xxxxxxxxx => giữ nguyên
  if (digits.startsWith("84")) return digits;

  // người dùng nhập 9 số (thiếu 0) => coi như 0 + ...
  if (digits.length === 9) return "84" + digits;

  // fallback: cứ trả digits
  return digits;
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, phone, password } = req.body || {};
    const phoneNormalized = normalizeVNPhone(phone);

    if (!name?.trim()) return res.status(400).send("Thiếu họ tên.");
    if (!phoneNormalized) return res.status(400).send("Thiếu số điện thoại.");
    if (!password || String(password).length < 6)
      return res.status(400).send("Mật khẩu tối thiểu 6 ký tự.");

    const exists = await User.findOne({ phoneNormalized });
    if (exists) return res.status(409).send("Số điện thoại đã được đăng ký.");

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
  phone: String(phone).trim(),
  phoneNormalized,
  passwordHash,
  role: "user",
  isActive: true,
  profile: {
    displayName: name.trim(),
    username: name.trim(),
    phone: String(phone).trim(),
  },
});


    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { phone, password } = req.body || {};
    const phoneNormalized = normalizeVNPhone(phone);

    if (!phoneNormalized || !password)
      return res.status(400).send("Thiếu số điện thoại hoặc mật khẩu.");

    // 1) ưu tiên tìm theo phoneNormalized
    let user =
      (await User.findOne({ phoneNormalized, isActive: true })) ||
      null;

    // 2) fallback: dữ liệu cũ chưa có phoneNormalized -> tìm theo phone / profile.phone
    if (!user) {
      const raw = String(phone || "").trim();
      user =
        (await User.findOne({ phone: raw, isActive: true })) ||
        (await User.findOne({ "profile.phone": raw, isActive: true })) ||
        null;

      // 3) nếu tìm được user cũ thì đồng bộ lại phoneNormalized (+ phone) để lần sau login nhanh
      if (user) {
        user.phone = user.phone || raw;
        user.phoneNormalized = phoneNormalized;
        if (user.profile) user.profile.phone = user.profile.phone || raw;
        await user.save();
      }
    }

    if (!user) return res.status(401).send("Sai số điện thoại hoặc mật khẩu.");

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).send("Sai số điện thoại hoặc mật khẩu.");

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.profile?.displayName || "", // ✅ bạn đang lưu tên trong profile
        phone: user.phone || user.profile?.phone || "",
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
});


// GET /api/auth/me


export default router;
