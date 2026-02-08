import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    description: { type: String, default: "" },

    visibility: { type: String, enum: ["public", "private"], default: "private" },

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isHidden: { type: Boolean, default: false }, // giống mock của bạn
  },
  { timestamps: true }
);

export default mongoose.model("Group", GroupSchema);
