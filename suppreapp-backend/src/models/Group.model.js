import mongoose from "mongoose";

const GroupImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const GroupDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const GroupPostSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true, timestamps: true }
);

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    visibility: { type: String, enum: ["public", "private"], default: "private" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parentGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    isHidden: { type: Boolean, default: false },
    images: { type: [GroupImageSchema], default: [] },
    documents: { type: [GroupDocumentSchema], default: [] },
    posts: { type: [GroupPostSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Group", GroupSchema);
