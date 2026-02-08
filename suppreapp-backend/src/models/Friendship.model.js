import mongoose from "mongoose";

const FriendshipSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    addresseeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "blocked"],
      default: "pending",
      index: true,
    },

    // ai block ai (nếu blocked)
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// tránh trùng cặp
FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

export default mongoose.model("Friendship", FriendshipSchema);
