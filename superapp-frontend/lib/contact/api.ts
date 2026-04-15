import type {
  Friend,
  FriendRequestItem,
  Group,
  GroupRelationshipTree,
  GroupRelationshipTreeSummary,
  GroupPost,
  NewsArticle,
  Relationship,
  UserEvaluation,
  UserPublic,
} from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function http<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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

function mapGroup(g: any): Group {
  return {
    id: g.id || g._id,
    name: g.name || "-",
    description: g.description || "",
    visibility: g.visibility || "private",
    avatarUrl: g.avatarUrl || "",
    coverUrl: g.coverUrl || "",
    ownerId: g.ownerId || "",
    parentGroupId: g.parentGroupId || "",
    childCount: Number(g.childCount || 0),
    isHidden: !!g.isHidden,
    memberIds: Array.isArray(g.memberIds) ? g.memberIds : [],
    myRole: g.myRole || "member",
    images: Array.isArray(g.images) ? g.images : [],
    documents: Array.isArray(g.documents) ? g.documents : [],
    posts: Array.isArray(g.posts) ? g.posts : [],
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

function mapUser(u: any): UserPublic {
  return {
    ...u,
    id: u?.id || u?._id,
    images: Array.isArray(u?.images)
      ? u.images.map((item: any) => ({ ...item, id: item.id || item._id }))
      : [],
    files: Array.isArray(u?.files)
      ? u.files.map((item: any) => ({ ...item, id: item.id || item._id }))
      : [],
  };
}

function mapGroupRelationshipTreeSummary(item: any): GroupRelationshipTreeSummary {
  return {
    id: item?.id || item?._id || "",
    groupId: item?.groupId || "",
    name: item?.name || "Untitled",
    nodeCount: Number(item?.nodeCount || 0),
    rootCount: Number(item?.rootCount || 0),
    createdBy: item?.createdBy || "",
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function mapGroupRelationshipTree(item: any): GroupRelationshipTree {
  return {
    ...mapGroupRelationshipTreeSummary(item),
    nodes: Array.isArray(item?.nodes)
      ? item.nodes.map((node: any) => ({
          id: node?.id || node?._id || "",
          userId: node?.userId || "",
          parentNodeId: node?.parentNodeId || "",
          orderIndex: Number(node?.orderIndex || 0),
          user: node?.user ? mapUser(node.user) : null,
        }))
      : [],
  };
}

export async function fetchMe(token: string): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>("/api/users/me", token);
  return mapUser(r.user);
}

export type UpdateMePayload = {
  profile?: Partial<UserPublic["profile"]>;
};

export type MediaScope = "user" | "group";
export type MediaKind = "image" | "file" | "avatar" | "cover";
export type MediaUploadFile = {
  uri: string;
  name: string;
  type?: string;
};

export async function updateMe(token: string, payload: UpdateMePayload): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>("/api/users/me", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapUser(r.user);
}

export async function fetchUserById(
  token: string,
  id: string
): Promise<{ user: UserPublic; relationship: Relationship }> {
  const r = await http<{ user: UserPublic; relationship: Relationship }>(`/api/users/${id}`, token);
  return { ...r, user: mapUser(r.user) };
}

export async function searchUsers(
  token: string,
  q: string,
  opts?: { limit?: number; skip?: number }
): Promise<UserPublic[]> {
  const qs = new URLSearchParams();
  if (q?.trim()) qs.set("q", q.trim());
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  if (opts?.skip != null) qs.set("skip", String(opts.skip));

  const r = await http<{ items: UserPublic[] }>(`/api/users?${qs.toString()}`, token);
  return r.items.map(mapUser);
}

export async function fetchFriends(token: string): Promise<Friend[]> {
  const r = await http<{ items: UserPublic[] }>("/api/friends", token);
  return r.items.map(mapUser).map((u) => ({
    id: u.id,
    name: u.profile?.displayName || "-",
    phone: u.profile?.phone || "",
    avatar: u.profile?.avatarUrl || "",
    isOnline: false,
  }));
}

export async function fetchFriendRequests(token: string): Promise<FriendRequestItem[]> {
  const r = await http<{ items: FriendRequestItem[] }>("/api/friends/requests", token);
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
  payload: { displayName: string; phone: string; username?: string }
): Promise<UserPublic> {
  const r = await http<{ ok: true; user: UserPublic }>("/api/admin/create-friend", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapUser(r.user);
}

export async function adminUpdateUser(
  token: string,
  userId: string,
  payload: {
    profile?: Partial<UserPublic["profile"]>;
    evaluation?: UserEvaluation;
    images?: UserPublic["images"];
    files?: UserPublic["files"];
  }
): Promise<UserPublic> {
  const r = await http<{ user: UserPublic }>(`/api/admin/users/${userId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapUser(r.user);
}

export async function adminDeleteUser(token: string, userId: string): Promise<boolean> {
  const r = await http<{ ok: boolean }>(`/api/admin/users/${userId}`, token, {
    method: "DELETE",
  });
  return r.ok;
}

export async function openDM(token: string, userId: string): Promise<{ conversationId: string }> {
  return http(`/api/messages/dm/${userId}`, token, { method: "POST" });
}

export async function fetchMessages(token: string, conversationId: string) {
  return http<{ items: any[] }>(`/api/messages/${conversationId}?limit=50`, token);
}

export async function sendMessage(token: string, conversationId: string, text: string) {
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

export async function fetchGroups(
  token: string,
  opts?: { parentId?: string }
): Promise<Group[]> {
  const qs = new URLSearchParams();
  if (opts?.parentId?.trim()) qs.set("parentId", opts.parentId.trim());
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const r = await http<{ items: any[] }>(`/api/groups${suffix}`, token);
  return (r.items || []).map(mapGroup);
}

export async function fetchNewsArticles(
  token: string,
  opts?: { limit?: number }
): Promise<NewsArticle[]> {
  const qs = new URLSearchParams();
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const r = await http<{ items: NewsArticle[] }>(`/api/news${suffix}`, token);
  return Array.isArray(r.items) ? r.items : [];
}

export async function fetchGroupById(token: string, id: string): Promise<Group> {
  const g = await http<any>(`/api/groups/${id}`, token);
  return mapGroup(g);
}

export async function fetchGroupMembers(
  token: string,
  id: string
): Promise<{
  items: {
    userId: string;
    role: "owner" | "admin" | "member";
    isMuted?: boolean;
    createdAt?: string;
    user?: UserPublic | null;
  }[];
  myRole: "owner" | "admin" | "member";
}> {
  return http(`/api/groups/${id}/members`, token);
}

export async function addGroupMember(token: string, groupId: string, userId: string) {
  return http(`/api/groups/${groupId}/members`, token, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function removeGroupMember(token: string, groupId: string, userId: string) {
  return http(`/api/groups/${groupId}/members/${userId}`, token, { method: "DELETE" });
}

export async function updateGroup(
  token: string,
  groupId: string,
  patch: Partial<Pick<Group, "name" | "description" | "avatarUrl" | "coverUrl" | "visibility">>
) {
  return http(`/api/groups/${groupId}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function updateMemberRole(
  token: string,
  groupId: string,
  userId: string,
  role: "admin" | "member"
) {
  return http(`/api/groups/${groupId}/members/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

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
    parentGroupId?: string;
  }
): Promise<Group> {
  const g = await http<any>("/api/groups", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapGroup(g);
}

export async function fetchGroupPosts(token: string, groupId: string): Promise<GroupPost[]> {
  const r = await http<{ items: GroupPost[] }>(`/api/groups/${groupId}/posts`, token);
  return r.items || [];
}

export async function fetchGroupRelationshipTrees(
  token: string,
  groupId: string
): Promise<GroupRelationshipTreeSummary[]> {
  const r = await http<{ items: GroupRelationshipTreeSummary[] }>(
    `/api/groups/${groupId}/relationship-trees`,
    token
  );
  return Array.isArray(r.items) ? r.items.map(mapGroupRelationshipTreeSummary) : [];
}

export async function createGroupRelationshipTree(
  token: string,
  groupId: string,
  payload: { name: string }
): Promise<GroupRelationshipTreeSummary> {
  const r = await http<any>(`/api/groups/${groupId}/relationship-trees`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapGroupRelationshipTreeSummary(r);
}

export async function fetchGroupRelationshipTreeById(
  token: string,
  groupId: string,
  treeId: string
): Promise<GroupRelationshipTree> {
  const r = await http<any>(`/api/groups/${groupId}/relationship-trees/${treeId}`, token);
  return mapGroupRelationshipTree(r);
}

export async function renameGroupRelationshipTree(
  token: string,
  groupId: string,
  treeId: string,
  payload: { name: string }
): Promise<GroupRelationshipTreeSummary> {
  const r = await http<any>(`/api/groups/${groupId}/relationship-trees/${treeId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapGroupRelationshipTreeSummary(r);
}

export async function deleteGroupRelationshipTree(
  token: string,
  groupId: string,
  treeId: string
): Promise<{ ok: true }> {
  return http(`/api/groups/${groupId}/relationship-trees/${treeId}`, token, {
    method: "DELETE",
  });
}

export async function addGroupRelationshipNode(
  token: string,
  groupId: string,
  treeId: string,
  payload: { userId: string; parentNodeId?: string }
): Promise<GroupRelationshipTree> {
  const r = await http<any>(`/api/groups/${groupId}/relationship-trees/${treeId}/nodes`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapGroupRelationshipTree(r);
}

export async function deleteGroupRelationshipNode(
  token: string,
  groupId: string,
  treeId: string,
  nodeId: string
): Promise<GroupRelationshipTree> {
  const r = await http<any>(
    `/api/groups/${groupId}/relationship-trees/${treeId}/nodes/${nodeId}`,
    token,
    { method: "DELETE" }
  );
  return mapGroupRelationshipTree(r);
}

export async function createGroupPost(
  token: string,
  groupId: string,
  payload: { content: string }
) {
  return http<{ ok: true; item: GroupPost }>(`/api/groups/${groupId}/posts`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateGroupPost(
  token: string,
  groupId: string,
  postId: string,
  payload: { content: string }
) {
  return http<{ ok: true; item: GroupPost }>(`/api/groups/${groupId}/posts/${postId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadMedia(
  token: string,
  payload: {
    scope: MediaScope;
    ownerId: string;
    kind: MediaKind;
    files: MediaUploadFile[];
  }
): Promise<{ success: true; items: any[]; user?: UserPublic; group?: Group }> {
  const form = new FormData();
  form.append("scope", payload.scope);
  form.append("ownerId", payload.ownerId);
  form.append("kind", payload.kind);

  for (const file of payload.files) {
    form.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/octet-stream",
    } as any);
  }

  const res = await fetch(`${API_URL}/api/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  const data = JSON.parse(text);
  if (data.user) data.user = mapUser(data.user);
  if (data.group) data.group = mapGroup(data.group);
  return data;
}

export async function deleteMedia(
  token: string,
  payload: {
    scope: MediaScope;
    ownerId: string;
    kind: MediaKind;
    mediaId?: string;
  }
): Promise<{ success: true; user?: UserPublic; group?: Group }> {
  const data = await http<{ success: true; user?: UserPublic; group?: Group }>("/api/media", token, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
  if (data.user) data.user = mapUser(data.user);
  if (data.group) data.group = mapGroup(data.group);
  return data;
}

export async function setGroupMemberRole(
  token: string,
  groupId: string,
  userId: string,
  role: "owner" | "admin" | "member"
) {
  return http<{ ok: true }>(`/api/groups/${groupId}/members/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
