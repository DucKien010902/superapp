import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, index: true }, // optional
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },

    bio: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    birthday: { type: String, default: "" }, // "YYYY-MM-DD" (đơn giản)
    phone: { type: String, default: "" },

    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    work: { type: String, default: "" },
    education: { type: String, default: "" },

    links: [
      {
        label: { type: String, default: "" },
        url: { type: String, default: "" },
      },
    ],
  },
  { _id: false }
);

const SettingsSchema = new mongoose.Schema(
  {
    isPrivate: { type: Boolean, default: false }, // khóa profile
    allowMessages: { type: String, enum: ["everyone", "friends"], default: "friends" },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    // auth
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["admin", "staff", "user"], default: "user" },
    isActive: { type: Boolean, default: true },

    // profile
    profile: { type: ProfileSchema, required: true },

    // settings
    settings: { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
