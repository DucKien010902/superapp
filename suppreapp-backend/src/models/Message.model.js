import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    text: { type: String, default: "" },
    attachments: [
      {
        kind: { type: String, enum: ["image", "file", "video"], default: "image" },
        url: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Message", MessageSchema);
