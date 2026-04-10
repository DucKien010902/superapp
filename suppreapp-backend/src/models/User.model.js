import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, sparse: true, index: true },
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

const UserImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: "" },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const UserFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, default: "" },
    phone: { type: String, default: "", index: true },
    phoneNormalized: { type: String, unique: true, sparse: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    profile: { type: ProfileSchema, required: true },
    settings: { type: SettingsSchema, default: () => ({}) },
    evaluation: {
      score: { type: String, default: "" },
      attitude: { type: String, default: "" },
      skill: { type: String, default: "" },
      general: {
        type: [String],
        validate: [(val) => val.length <= 3, "{PATH} exceeds the limit of 3"],
      },
      detailed: [
        {
          text: { type: String, default: "" },
          date: { type: String, default: "" },
        },
      ],
    },
    images: { type: [UserImageSchema], default: [] },
    files: { type: [UserFileSchema], default: [] },
    lastViewedVersion: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
