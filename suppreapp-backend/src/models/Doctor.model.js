import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: String,
    address: String,
    agentLevel: { type: String, default: "cap3" },
    agentTierLabel: { type: String, default: "" }, // label hiển thị
    note: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", DoctorSchema);
