import mongoose from "mongoose";

const OptionItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const OptionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    items: { type: [OptionItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Option", OptionSchema);
