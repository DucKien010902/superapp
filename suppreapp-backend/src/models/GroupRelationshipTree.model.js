import mongoose from "mongoose";

const GroupRelationshipNodeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parentNodeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    orderIndex: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false }
);

const GroupRelationshipTreeSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    name: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    nodes: { type: [GroupRelationshipNodeSchema], default: [] },
  },
  { timestamps: true }
);

GroupRelationshipTreeSchema.index({ groupId: 1, updatedAt: -1 });

export default mongoose.model("GroupRelationshipTree", GroupRelationshipTreeSchema);
