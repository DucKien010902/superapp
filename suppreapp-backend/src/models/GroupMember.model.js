import mongoose from "mongoose";

const GroupMemberSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
    isMuted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export default mongoose.model("GroupMember", GroupMemberSchema);
