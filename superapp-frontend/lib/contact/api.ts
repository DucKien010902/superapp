// lib/contact/api.ts
import type {
  Friend,
  FriendRequestItem,
  Group,
  Relationship,
  UserPublic,
} from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function http<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===== USERS
export async function fetchMe(token: string): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>("/api/users/me", token);
  return r.user;
}
export type UpdateMePayload = {
  profile?: Partial<UserPublic["profile"]>;
};

export async function updateMe(
  token: string,
  payload: UpdateMePayload,
): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>("/api/users/me", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return r.user;
}

export async function fetchUserById(
  token: string,
  id: string,
): Promise<{ user: UserPublic; relationship: Relationship }> {
  return http(`/api/users/${id}`, token);
}

export async function searchUsers(
  token: string,
  q: string,
  opts?: { limit?: number; skip?: number },
): Promise<UserPublic[]> {
  const qs = new URLSearchParams();
  if (q?.trim()) qs.set("q", q.trim());
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.skip != null) qs.set("skip", String(opts.skip));

  const r = await http<{ items: UserPublic[] }>(
    `/api/users?${qs.toString()}`,
    token,
  );
  return r.items;
}

// ===== FRIENDS
export async function fetchFriends(token: string): Promise<Friend[]> {
  const r = await http<{ items: UserPublic[] }>("/api/friends", token);
  // Friend = userPublic dạng list
  return r.items.map((u) => ({
    id: u.id,
    name: u.profile?.displayName || "—",
    phone: u.profile?.phone || "",
    avatar: u.profile?.avatarUrl || "",
    isOnline: false,
  }));
}

export async function fetchFriendRequests(
  token: string,
): Promise<FriendRequestItem[]> {
  const r = await http<{ items: FriendRequestItem[] }>(
    "/api/friends/requests",
    token,
  );
  return r.items;
}

export async function requestFriend(token: string, userId: string) {
  return http(`/api/friends/request/${userId}`, token, { method: "POST" });
}

export async function acceptFriend(token: string, userId: string) {
  return http(`/api/friends/accept/${userId}`, token, { method: "POST" });
}

export async function cancelOrUnfriend(token: string, userId: string) {
  return http(`/api/friends/cancel/${userId}`, token, { method: "POST" });
}
export async function adminCreateFriend(
  token: string,
  payload: { displayName: string; phone: string; username?: string },
): Promise<UserPublic> {
  const r = await http<{ ok: true; user: UserPublic }>(
    "/api/admin/create-friend",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return r.user;
}
export async function adminUpdateUser(
  token: string,
  userId: string,
  payload: { profile?: Partial<UserPublic["profile"]> },
): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>(`/api/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return r.user;
}

// ===== MESSAGES
export async function openDM(
  token: string,
  userId: string,
): Promise<{ conversationId: string }> {
  return http(`/api/messages/dm/${userId}`, token, { method: "POST" });
}

export async function fetchMessages(token: string, conversationId: string) {
  return http<{ items: any[] }>(
    `/api/messages/${conversationId}?limit=50`,
    token,
  );
}

export async function sendMessage(
  token: string,
  conversationId: string,
  text: string,
) {
  return http(`/api/messages/${conversationId}`, token, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
export async function openGroupChat(token: string, groupId: string) {
  return http<{
    conversationId: string;
    group?: {
      id: string;
      name: string;
      avatarUrl?: string;
      memberCount?: number;
    };
  }>(`/api/messages/group/${groupId}`, token, {
    method: "POST",
  });
}
// ===== GROUPS

// GET /api/groups  -> { items: Group[] } (backend mới trả id, memberIds, myRole...)
export async function fetchGroups(token: string): Promise<Group[]> {
  const r = await http<{ items: any[] }>("/api/groups", token);

  return (r.items || []).map((g) => ({
    id: g.id || g._id,
    name: g.name || "—",
    description: g.description || "",
    visibility: g.visibility || "private",
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: g.ownerId || "",
    isHidden: !!g.isHidden,
    memberIds: Array.isArray(g.memberIds) ? g.memberIds : [],
    myRole: g.myRole || "member",
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}

// GET /api/groups/:id  -> Group detail (chỉ member mới xem được)
export async function fetchGroupById(
  token: string,
  id: string,
): Promise<Group> {
  const g = await http<any>(`/api/groups/${id}`, token);
  return {
    id: g.id || g._id,
    name: g.name || "—",
    description: g.description || "",
    visibility: g.visibility || "private",
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: g.ownerId || "",
    isHidden: !!g.isHidden,
    memberIds: Array.isArray(g.memberIds) ? g.memberIds : [],
    myRole: g.myRole || "member",
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

// GET /api/groups/:id/members -> { items: [{ userId, role, ... }], myRole }
export async function fetchGroupMembers(
  token: string,
  id: string,
): Promise<{
  items: Array<{
    userId: string;
    role: "owner" | "admin" | "member";
    isMuted?: boolean;
    createdAt?: string;
  }>;
  myRole: "owner" | "admin" | "member";
}> {
  return http(`/api/groups/${id}/members`, token);
}

// POST /api/groups/:id/members body { userId }
export async function addGroupMember(
  token: string,
  groupId: string,
  userId: string,
) {
  return http(`/api/groups/${groupId}/members`, token, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// DELETE /api/groups/:id/members/:userId
export async function removeGroupMember(
  token: string,
  groupId: string,
  userId: string,
) {
  return http(`/api/groups/${groupId}/members/${userId}`, token, {
    method: "DELETE",
  });
}

// PATCH /api/groups/:id (update info)
export async function updateGroup(
  token: string,
  groupId: string,
  patch: Partial<
    Pick<
      Group,
      "name" | "description" | "avatarUrl" | "coverUrl" | "visibility"
    >
  >,
) {
  return http(`/api/groups/${groupId}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// PATCH /api/groups/:id/members/:userId/role body { role }
export async function updateMemberRole(
  token: string,
  groupId: string,
  userId: string,
  role: "admin" | "member",
) {
  return http(`/api/groups/${groupId}/members/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// DELETE /api/groups/:id (owner only)
export async function deleteGroup(token: string, groupId: string) {
  return http(`/api/groups/${groupId}`, token, { method: "DELETE" });
}
export async function createGroup(
  token: string,
  payload: {
    name: string;
    description?: string;
    visibility?: "public" | "private";
    avatarUrl?: string;
    coverUrl?: string;
  },
): Promise<Group> {
  const g = await http<any>(`/api/groups`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    id: g.id || g._id,
    name: g.name || "—",
    description: g.description || "",
    visibility: g.visibility || "private",
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: g.ownerId || "",
    isHidden: !!g.isHidden,
    memberIds: Array.isArray(g.memberIds) ? g.memberIds : [],
    myRole: g.myRole || "owner",
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}
export async function fetchGroupNotices(token: string, groupId: string) {
  return http<{ items: any[] }>(`/api/groups/${groupId}/notices`, token);
}

export async function createGroupNotice(
  token: string,
  groupId: string,
  payload: { title: string; isPinned?: boolean },
) {
  return http<{ ok: true; item: any }>(
    `/api/groups/${groupId}/notices`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createGroupNoticeItem(
  token: string,
  groupId: string,
  noticeId: string,
  payload: { text: string },
) {
  return http<{ ok: true; item: any }>(
    `/api/groups/${groupId}/notices/${noticeId}/items`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
export async function setGroupMemberRole(
  token: string,
  groupId: string,
  userId: string,
  role: "owner" | "admin" | "member",
) {
  return http<{ ok: true }>(
    `/api/groups/${groupId}/members/${userId}/role`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}
