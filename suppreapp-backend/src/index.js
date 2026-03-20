import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./db.js";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import friendsRoutes from "./routes/friends.routes.js";
import groups2Routes from "./routes/groups.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import versionRoutes from "./routes/version.routes.js";

import { requireAuth } from "./middlewares/auth.middleware.js";
import { browserGate } from "./middlewares/browserGate.middleware.js";

dotenv.config();

const app = express();

app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000")
.split(",")
.map((s) => s.trim())
.filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/health", (req, res) => res.json({ ok: true }));

// ✅ public routes
app.use("/api/auth", authRoutes);

// ✅ protected routes: chống request không phải browser (mutation) + yêu cầu token
app.use("/api/users", requireAuth, usersRoutes);

app.use("/api/friends", requireAuth, friendsRoutes);
app.use("/api/groups", requireAuth, groups2Routes);
app.use("/api/messages", requireAuth, messagesRoutes);
app.use("/api/admin", requireAuth, adminRoutes);
app.use('/api/version',requireAuth, versionRoutes)

// error handler
app.use((err, req, res, next) => {
  console.error("❌", err);
  res.status(500).json({ message: err?.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0'; // QUAN TRỌNG: Lắng nghe trên mọi interface mạng

connectDB(process.env.MONGO_URI)
  .then(() => {
    // Thêm tham số HOST vào giữa PORT và callback
    app.listen(PORT, HOST, () =>
      console.log(`✅ API listening on http://${HOST}:${PORT}`)
    );
  })
  .catch((e) => {
    console.error("Mongo connect error:", e);
    process.exit(1);
  });
