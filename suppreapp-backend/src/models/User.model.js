import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, index: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },

    bio: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    birthday: { type: String, default: "" },
    phone: { type: String, default: "" },

    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    work: { type: String, default: "" },
    education: { type: String, default: "" },

    links: [{ label: { type: String, default: "" }, url: { type: String, default: "" } }],
  },
  { _id: false }
);

const SettingsSchema = new mongoose.Schema(
  {
    isPrivate: { type: Boolean, default: false },
    allowMessages: { type: String, enum: ["everyone", "friends"], default: "friends" },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    // ✅ auth: dùng phone
    email: { type: String, default: "", }, // ✅ bỏ required/unique
    phone: { type: String, default: "", index: true },
    phoneNormalized: { type: String, unique: true, sparse: true, index: true },

    passwordHash: { type: String, required: true },

    role: { type: String, enum: ["admin", "staff", "user"], default: "user" },
    isActive: { type: Boolean, default: true },

    // ✅ profile vẫn required -> ok, nhưng register phải set displayName
    profile: { type: ProfileSchema, required: true },

    settings: { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
