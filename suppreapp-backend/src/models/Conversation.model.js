import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["dm", "group"], default: "dm", index: true },

    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    // nếu group chat
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

    lastMessageAt: { type: Date, default: null },
    lastMessageText: { type: String, default: "" },
  },
  { timestamps: true }
);

ConversationSchema.index({ type: 1, groupId: 1 });

export default mongoose.model("Conversation", ConversationSchema);
