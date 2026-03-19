export interface EvaluationItem {
  text: string;
  date: string; // VD: '2023-10-25'
}

export interface UserEvaluation {
  score?: string;     // Chấm điểm
  attitude?: string;  // Thái độ
  skill?: string;     // Trình độ
  general?: string[]; // Đánh giá tổng quan (Tối đa 3)
  detailed?: EvaluationItem[]; // Đánh giá chi tiết
}
export type UserPublic = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  profile: {
    username?: string;
    displayName: string;
    avatarUrl?: string;
    coverUrl?: string;

    bio?: string;
    gender?: string;
    birthday?: string;
    phone?: string;

    location?: { city?: string; country?: string };
    work?: string;
    education?: string;
    links?: Array<{ label: string; url: string }>;
  };
  evaluation?: UserEvaluation; // <--- THÊM DÒNG NÀY
  createdAt?: string;
  updatedAt?: string;
};

export type Relationship = {
  status: "none" | "pending" | "accepted" | "declined" | "blocked";
  direction: "none" | "outgoing" | "incoming";
};

export type Friend = {
  id: string;
  name: string;
  phone?: string;
  avatar?: string;
  isOnline?: boolean;
};

export type FriendRequestItem = {
  id: string;
  requester: UserPublic;
  createdAt: string;
};
export type Group = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  avatarUrl?: string;
  coverUrl?: string;
  ownerId: string;
  isHidden?: boolean;
  memberIds: string[];
  myRole: "owner" | "admin" | "member";
  createdAt?: string;
  updatedAt?: string;
};

export type GroupNoticeItem = {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
};

export type GroupNotice = {
  id: string;
  groupId: string;
  title: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: GroupNoticeItem[];
};
