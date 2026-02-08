import mongoose from "mongoose";

const PriceByLevelSchema = new mongoose.Schema(
  {
    level: { type: String, required: true }, // cap1/cap2/cap3...
    price: { type: Number, required: true },
  },
  { _id: false }
);

const ServiceSchema = new mongoose.Schema(
  {
    serviceType: { type: String, enum: ["NIPT", "ADN", "HPV"], required: true },
    serviceCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    turnaroundHours: { type: Number, default: 48 },
    pricesByLevel: { type: [PriceByLevelSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Service", ServiceSchema);
