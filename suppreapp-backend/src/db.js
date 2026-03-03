import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    autoIndex: true,

    // 🔥 QUAN TRỌNG NHẤT
    family: 4, // ép dùng IPv4

    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  console.log("✅ MongoDB connected");
}