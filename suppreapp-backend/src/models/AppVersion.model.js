// models/AppVersion.model.js
import mongoose from "mongoose";

const appVersionSchema = new mongoose.Schema(
  {
    versionCode: { type: String, required: true }, // VD: "1.0.5"
    downloadUrl: { type: String, required: true }, // Link tải APK/IPA
    releaseNotes: { type: String, default: "" }, // Ghi chú (nếu có)
    isActive: { type: Boolean, default: true }, // Đánh dấu đây là bản mới nhất
  },
  { timestamps: true } // Sẽ tự sinh createdAt (Ngày update)
);

export default mongoose.model("AppVersion", appVersionSchema);