import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "./db.js";
import User from "./models/User.model.js";

dotenv.config();

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne(
    { email },
    { $set: { name, email, passwordHash, role, isActive: true } },
    { upsert: true }
  );
}

async function run() {
  await connectDB(process.env.MONGO_URI);

  await upsertUser({
    name: "Admin",
    email: "admin@genno.local",
    password: "Admin@123",
    role: "admin",
  });

  await upsertUser({
    name: "Nhân viên",
    email: "staff@genno.local",
    password: "Staff@123",
    role: "staff",
  });

  console.log("✅ Seed users done");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
