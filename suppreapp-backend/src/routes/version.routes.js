// routes/version.routes.js
import { Router } from "express";
import AppVersion from "../models/AppVersion.model.js";
import User from "../models/User.model.js";

const router = Router();

// Middleware: Chỉ cho phép số điện thoại Admin thao tác tạo
async function requireSuperAdmin(req, res, next) {
  try {
    // 1. Kiểm tra xem request có token hợp lệ không (đã được Auth Middleware gắn vào req.user.id)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2. Tìm user thực tế trong Database dựa vào ID giải mã từ Token
    const currentUser = await User.findById(req.user.id).lean();

    // 3. Số điện thoại của bạn sau khi qua hàm normalizeVNPhone sẽ có dạng 84...
    const superPhone = "84965731936"; 
    
    // 4. Nếu không phải bạn -> Đá ra ngoài
    if (!currentUser || currentUser.phoneNormalized !== superPhone) {
      return res.status(403).json({ message: "Chỉ Super Admin mới được cập nhật version" });
    }

    // 5. Nếu đúng là bạn -> Cho phép đi tiếp vào API
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/version/latest
 * Lấy thông tin bản cập nhật mới nhất (Ai cũng gọi được)
 */
router.get("/latest", async (req, res, next) => {
  try {
    const latest = await AppVersion.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json(latest || null);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/version
 * Tạo bản cập nhật mới (Chỉ SĐT của bạn mới gọi được)
 * Body: { versionCode, downloadUrl, releaseNotes }
 */
router.post("/", requireSuperAdmin, async (req, res, next) => {
  try {
    const { versionCode, downloadUrl, releaseNotes } = req.body;
    
    // Hủy active các bản cũ
    await AppVersion.updateMany({}, { isActive: false });

    // Tạo bản mới
    const newVersion = await AppVersion.create({
      versionCode,
      downloadUrl,
      releaseNotes,
      isActive: true,
    });

    res.json(newVersion);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/version/viewed
 * Lưu trạng thái User đã xem bản cập nhật này
 * Body: { versionCode }
 */
router.patch("/viewed", async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    
    const { versionCode } = req.body;
    
    // Cập nhật trường lastViewedVersion cho user đang đăng nhập
    await User.findByIdAndUpdate(req.user.id, { lastViewedVersion: versionCode });
    
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;