export interface EvaluationItem {
  text: string;
  date: string;
}

export interface UserEvaluation {
  score?: string;
  attitude?: string;
  skill?: string;
  general?: string[];
  detailed?: EvaluationItem[];
}

export type UserImage = {
  id?: string;
  url: string;
  caption?: string;
  createdAt?: string;
};

export type UserFile = {
  id?: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
};

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
    note?: string;
    gender?: string;
    birthday?: string;
    phone?: string;
    location?: { city?: string; country?: string };
    work?: string;
    education?: string;
    links?: { label: string; url: string }[];
  };
  evaluation?: UserEvaluation;
  images?: UserImage[];
  files?: UserFile[];
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
  secondaryLines?: string[];
};

export type FriendRequestItem = {
  id: string;
  requester: UserPublic;
  createdAt: string;
};

export type GroupImage = {
  id?: string;
  url: string;
  caption?: string;
  createdBy?: string;
  createdAt?: string;
};

export type GroupDocument = {
  id?: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdBy?: string;
  createdAt?: string;
};

export type GroupPost = {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupRelationshipTreeSummary = {
  id: string;
  groupId: string;
  name: string;
  nodeCount: number;
  rootCount: number;
  createdBy: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GroupRelationshipTreeNode = {
  id: string;
  userId: string;
  parentNodeId?: string;
  orderIndex: number;
  user?: UserPublic | null;
};

export type GroupRelationshipTree = GroupRelationshipTreeSummary & {
  nodes: GroupRelationshipTreeNode[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  avatarUrl?: string;
  coverUrl?: string;
  ownerId: string;
  parentGroupId?: string;
  childCount?: number;
  isHidden?: boolean;
  memberIds: string[];
  myRole: "owner" | "admin" | "member";
  images?: GroupImage[];
  documents?: GroupDocument[];
  posts?: GroupPost[];
  createdAt?: string;
  updatedAt?: string;
};

export type NewsArticle = {
  id: string;
  sourceUrl: string;
  imageUrl: string;
  title: string;
  summary: string;
  publishedLabel: string;
  publishedAt?: string | null;
  lastSyncedAt?: string | null;
};
