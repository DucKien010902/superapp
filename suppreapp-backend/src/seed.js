import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "./db.js";

import User from "./models/User.model.js";
import Friendship from "./models/Friendship.model.js";
import Group from "./models/Group.model.js";
import GroupMember from "./models/GroupMember.model.js";
import Conversation from "./models/Conversation.model.js";
import Message from "./models/Message.model.js";

dotenv.config();

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randPhone() {
  const head = pick(["090", "091", "096", "097", "098", "032", "033", "034", "035", "036"]);
  const tail = String(Math.floor(Math.random() * 10 ** 7)).padStart(7, "0");
  return `${head}${tail}`;
}

function uid(n) {
  return n.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

async function clearSocial() {
  await Promise.all([
    Message.deleteMany({}),
    Conversation.deleteMany({}),
    GroupMember.deleteMany({}),
    Group.deleteMany({}),
    Friendship.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const base = [
    {
      email: "admin@demo.com",
      role: "admin",
      profile: {
        username: "admin",
        displayName: "Admin Demo",
        avatarUrl: "https://i.pravatar.cc/150?img=1",
        coverUrl: "https://picsum.photos/900/300?random=11",
        bio: "Tài khoản quản trị demo.",
        phone: randPhone(),
        gender: "other",
        location: { city: "Hà Nội", country: "VN" },
        work: "Quản trị hệ thống",
        education: "—",
        links: [{ label: "Website", url: "https://example.com" }],
      },
    },
    {
      email: "kien@demo.com",
      role: "user",
      profile: {
        username: "nguyenduckien",
        displayName: "Nguyễn Đức Kiên",
        avatarUrl: "https://i.pravatar.cc/150?img=8",
        coverUrl: "https://picsum.photos/900/300?random=12",
        bio: "Fullstack • React/Node • thích làm app hệ sinh thái.",
        phone: randPhone(),
        gender: "male",
        location: { city: "Hà Nội", country: "VN" },
        work: "Developer",
        education: "—",
        links: [{ label: "GitHub", url: "https://github.com/" }],
      },
    },
    {
      email: "huyen@demo.com",
      role: "user",
      profile: {
        username: "phamthuhuyen",
        displayName: "Phạm Thu Huyền",
        avatarUrl: "https://i.pravatar.cc/150?img=20",
        coverUrl: "https://picsum.photos/900/300?random=13",
        bio: "Thích du lịch và cà phê.",
        phone: randPhone(),
        gender: "female",
        location: { city: "Hải Phòng", country: "VN" },
        work: "Marketing",
        education: "—",
        links: [{ label: "Facebook", url: "https://facebook.com" }],
      },
    },
    {
      email: "long@demo.com",
      role: "user",
      profile: {
        username: "lehoanglong",
        displayName: "Lê Hoàng Long",
        avatarUrl: "https://i.pravatar.cc/150?img=12",
        coverUrl: "https://picsum.photos/900/300?random=14",
        bio: "Gym & code & chill.",
        phone: randPhone(),
        gender: "male",
        location: { city: "Đà Nẵng", country: "VN" },
        work: "Designer",
        education: "—",
        links: [{ label: "Behance", url: "https://behance.net" }],
      },
    },
    {
      email: "minhanh@demo.com",
      role: "user",
      profile: {
        username: "tranminhanh",
        displayName: "Trần Minh Anh",
        avatarUrl: "https://i.pravatar.cc/150?img=5",
        coverUrl: "https://picsum.photos/900/300?random=15",
        bio: "UI/UX lover.",
        phone: randPhone(),
        gender: "female",
        location: { city: "TP.HCM", country: "VN" },
        work: "Product",
        education: "—",
        links: [{ label: "LinkedIn", url: "https://linkedin.com" }],
      },
    },
    {
      email: "hau@demo.com",
      role: "user",
      profile: {
        username: "doquanghau",
        displayName: "Đỗ Quang Hậu",
        avatarUrl: "https://i.pravatar.cc/150?img=33",
        coverUrl: "https://picsum.photos/900/300?random=16",
        bio: "Yêu công nghệ và bóng đá.",
        phone: randPhone(),
        gender: "male",
        location: { city: "Nghệ An", country: "VN" },
        work: "Sales",
        education: "—",
        links: [{ label: "Zalo", url: "https://zalo.me" }],
      },
    },
  ];

  const docs = base.map((u) => ({
    email: u.email,
    passwordHash,
    role: u.role,
    isActive: true,
    profile: u.profile,
    settings: { isPrivate: false, allowMessages: "friends" },
  }));

  const created = await User.insertMany(docs);
  return created;
}

async function seedFriendships(users) {
  // map theo username/email cho dễ
  const byEmail = new Map(users.map((u) => [u.email, u]));

  const kien = byEmail.get("kien@demo.com");
  const huyen = byEmail.get("huyen@demo.com");
  const long = byEmail.get("long@demo.com");
  const minhanh = byEmail.get("minhanh@demo.com");
  const hau = byEmail.get("hau@demo.com");

  // Kiên ↔ Long: accepted
  // Kiên -> Huyền: pending outgoing
  // Minh Anh -> Kiên: pending incoming (để test accept)
  // Kiên ↔ Hậu: accepted
  const rels = [
    { requesterId: kien._id, addresseeId: long._id, status: "accepted" },
    { requesterId: kien._id, addresseeId: huyen._id, status: "pending" },
    { requesterId: minhanh._id, addresseeId: kien._id, status: "pending" },
    { requesterId: hau._id, addresseeId: kien._id, status: "accepted" },
  ];

  await Friendship.insertMany(rels);
}

async function seedGroups(users) {
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const kien = byEmail.get("kien@demo.com");
  const long = byEmail.get("long@demo.com");
  const huyen = byEmail.get("huyen@demo.com");
  const minhanh = byEmail.get("minhanh@demo.com");
  const hau = byEmail.get("hau@demo.com");

  const g1 = await Group.create({
    name: "Team Dự án",
    description: "Nhóm dự án nội bộ",
    visibility: "private",
    ownerId: kien._id,
    avatarUrl: "https://picsum.photos/200/200?random=21",
    coverUrl: "https://picsum.photos/900/300?random=22",
    isHidden: false,
  });

  const g2 = await Group.create({
    name: "Bạn thân",
    description: "Hội bạn thân thân ai nấy lo 😄",
    visibility: "private",
    ownerId: long._id,
    avatarUrl: "https://picsum.photos/200/200?random=23",
    coverUrl: "https://picsum.photos/900/300?random=24",
    isHidden: false,
  });

  await GroupMember.insertMany([
    { groupId: g1._id, userId: kien._id, role: "owner" },
    { groupId: g1._id, userId: long._id, role: "member" },
    { groupId: g1._id, userId: huyen._id, role: "member" },
    { groupId: g1._id, userId: minhanh._id, role: "member" },

    { groupId: g2._id, userId: long._id, role: "owner" },
    { groupId: g2._id, userId: kien._id, role: "member" },
    { groupId: g2._id, userId: hau._id, role: "member" },
  ]);

  return [g1, g2];
}

async function seedConversations(users, groups) {
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const kien = byEmail.get("kien@demo.com");
  const long = byEmail.get("long@demo.com");
  const hau = byEmail.get("hau@demo.com");

  // DM Kiên-Long
  const dm1 = await Conversation.create({
    type: "dm",
    memberIds: [kien._id, long._id],
    lastMessageAt: new Date(),
    lastMessageText: "Tối nay deploy không bro?",
  });

  // DM Kiên-Hậu
  const dm2 = await Conversation.create({
    type: "dm",
    memberIds: [kien._id, hau._id],
    lastMessageAt: new Date(),
    lastMessageText: "Ok chốt nhé!",
  });

  // Group chat cho g1
  const g1 = groups[0];
  const gc1 = await Conversation.create({
    type: "group",
    memberIds: [kien._id, long._id, hau._id],
    groupId: g1._id,
    lastMessageAt: new Date(),
    lastMessageText: "Mai họp 9h nhé mọi người",
  });

  // messages
  await Message.insertMany([
    {
      conversationId: dm1._id,
      senderId: kien._id,
      text: "Tối nay deploy không bro?",
      createdAt: new Date(Date.now() - 1000 * 60 * 25),
      updatedAt: new Date(Date.now() - 1000 * 60 * 25),
    },
    {
      conversationId: dm1._id,
      senderId: long._id,
      text: "Deploy nhẹ, nhớ check env.",
      createdAt: new Date(Date.now() - 1000 * 60 * 22),
      updatedAt: new Date(Date.now() - 1000 * 60 * 22),
    },
    {
      conversationId: dm2._id,
      senderId: hau._id,
      text: "Ok chốt nhé!",
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      conversationId: gc1._id,
      senderId: kien._id,
      text: "Mai họp 9h nhé mọi người",
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
      updatedAt: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      conversationId: gc1._id,
      senderId: long._id,
      text: "Okie 👍",
      createdAt: new Date(Date.now() - 1000 * 60 * 9),
      updatedAt: new Date(Date.now() - 1000 * 60 * 9),
    },
  ]);

  // refresh summary đúng theo message cuối
  await Conversation.findByIdAndUpdate(dm1._id, {
    lastMessageAt: new Date(),
    lastMessageText: "Deploy nhẹ, nhớ check env.",
  });
}

async function run() {
  await connectDB(process.env.MONGO_URI);

  const RESET = String(process.env.SEED_RESET || "1") === "1";
  if (RESET) {
    console.log("🧹 Clearing social collections...");
    await clearSocial();
  }

  console.log("👤 Seeding users...");
  const users = await seedUsers();

  console.log("🤝 Seeding friendships...");
  await seedFriendships(users);

  console.log("👥 Seeding groups...");
  const groups = await seedGroups(users);

  console.log("💬 Seeding conversations/messages...");
  await seedConversations(users, groups);

  console.log("✅ Done!");
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error("❌ Seed error:", e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
