import mongoose from "mongoose";

const NoticeItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const GroupNoticeSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true },
    isPinned: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: { type: [NoticeItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("GroupNotice", GroupNoticeSchema);