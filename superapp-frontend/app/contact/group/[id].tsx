import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import GroupRow from "@/components/contact/GroupRow";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import SearchBar from "@/components/contact/SearchBar";
import GroupAboutTab from "@/components/contact/group/GroupAboutTab";
import {
  Divider,
  GroupFilesPanel,
  GroupHeaderCard,
  GroupImagesPanel,
  GroupMediaPreviewModal,
  MediaPreview,
  TabPill,
  imageAssetName,
  imageMimeType,
  openExternalLink,
} from "@/components/contact/group/GroupDetailParts";
import GroupRelationsTab from "@/components/contact/group/GroupRelationsTab";
import { useAuth } from "@/lib/auth";
import {
  addGroupMember,
  createGroup,
  createGroupRelationshipTree,
  deleteGroup,
  deleteGroupRelationshipTree,
  deleteMedia,
  fetchGroupById,
  fetchGroupMembers,
  fetchGroupRelationshipTrees,
  fetchGroups,
  removeGroupMember,
  renameGroupRelationshipTree,
  searchUsers,
  uploadMedia,
} from "@/lib/contact/api";
import type { Friend, Group, GroupRelationshipTreeSummary, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type TabKey = "about" | "members" | "relations" | "media";
type MediaTabKey = "images" | "files";
type PickerMode = "user" | "child";
type MembersViewKey = "groups" | "users";
type RelationEditorMode = "create" | "rename";
type GroupMemberRow = {
  userId: string;
  role: "owner" | "admin" | "member";
  isMuted?: boolean;
  createdAt?: string;
  user?: UserPublic | null;
};

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const card = { backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" } as const;

function toFriend(user?: UserPublic | null, fallbackId = ""): Friend {
  return {
    id: user?.id || fallbackId,
    name: user?.profile?.displayName || `Người dùng ${String(fallbackId).slice(-4)}`,
    phone: user?.profile?.phone || "",
    avatar: user?.profile?.avatarUrl || "",
  };
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("members");
  const [mediaTab, setMediaTab] = useState<MediaTabKey>("images");
  const [membersView, setMembersView] = useState<MembersViewKey>("users");
  const [group, setGroup] = useState<Group | null>(null);
  const [childGroups, setChildGroups] = useState<Group[]>([]);
  const [memberRows, setMemberRows] = useState<GroupMemberRow[]>([]);
  const [relationshipTrees, setRelationshipTrees] = useState<GroupRelationshipTreeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [membersQ, setMembersQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("user");
  const [pickerQ, setPickerQ] = useState("");
  const [pickerUsers, setPickerUsers] = useState<UserPublic[]>([]);
  const [parentPickerUsers, setParentPickerUsers] = useState<UserPublic[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [busyAdd, setBusyAdd] = useState(false);
  const [childName, setChildName] = useState("");
  const [creatingChild, setCreatingChild] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [aboutOverlay, setAboutOverlay] = useState<ReactNode | null>(null);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [relationName, setRelationName] = useState("");
  const [relationEditorMode, setRelationEditorMode] = useState<RelationEditorMode>("create");
  const [editingTree, setEditingTree] = useState<GroupRelationshipTreeSummary | null>(null);
  const [savingRelation, setSavingRelation] = useState(false);

  const loadRelationshipTrees = useCallback(async () => {
    if (!token || !id) return;
    setRelationshipsLoading(true);
    try {
      setRelationshipTrees(await fetchGroupRelationshipTrees(token, id));
    } finally {
      setRelationshipsLoading(false);
    }
  }, [id, token]);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    setErr(null);
    setLoading(true);
    try {
      const [g, ms, children, trees] = await Promise.all([
        fetchGroupById(token, id),
        fetchGroupMembers(token, id),
        fetchGroups(token, { parentId: id }),
        fetchGroupRelationshipTrees(token, id),
      ]);
      setGroup(g);
      setMemberRows(ms.items || []);
      setChildGroups(children);
      setRelationshipTrees(trees);
    } catch (e: any) {
      setErr(e?.message || "Không tải được nhóm");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  useEffect(() => {
    if (!token || !pickerOpen || pickerMode !== "user" || group?.parentGroupId) return;
    const t = setTimeout(async () => {
      try {
        setPickerLoading(true);
        setPickerUsers(await searchUsers(token, pickerQ.trim(), { limit: 50, skip: 0 }));
      } catch {
        setPickerUsers([]);
      } finally {
        setPickerLoading(false);
      }
    }, pickerQ.trim() ? 250 : 0);
    return () => clearTimeout(t);
  }, [group?.parentGroupId, pickerMode, pickerOpen, pickerQ, token]);

  useEffect(() => {
    if (!token || !pickerOpen || pickerMode !== "user" || !group?.parentGroupId) return;
    let alive = true;
    const loadParentMembers = async () => {
      try {
        setPickerLoading(true);
        const parentMembers = await fetchGroupMembers(token, group.parentGroupId || "");
        if (!alive) return;
        setParentPickerUsers((parentMembers.items || []).map((item) => item.user).filter((item): item is UserPublic => !!item));
      } catch {
        if (!alive) return;
        setParentPickerUsers([]);
      } finally {
        if (alive) setPickerLoading(false);
      }
    };
    loadParentMembers();
    return () => {
      alive = false;
    };
  }, [group?.parentGroupId, pickerMode, pickerOpen, token]);

  const canManage = true;
  const memberCount = memberRows.length || group?.memberIds?.length || 0;
  const existedIds = useMemo(() => new Set(memberRows.map((m) => m.userId)), [memberRows]);
  const members = useMemo(() => {
    const q = membersQ.trim().toLowerCase();
    return memberRows.map((m) => ({ friend: toFriend(m.user, m.userId), role: m.role })).filter((x) => !q || x.friend.name.toLowerCase().includes(q) || (x.friend.phone || "").toLowerCase().includes(q));
  }, [memberRows, membersQ]);
  const filteredChildGroups = useMemo(() => {
    const q = membersQ.trim().toLowerCase();
    return childGroups.filter((g) => !q || (g.name || "").toLowerCase().includes(q));
  }, [childGroups, membersQ]);
  const candidatesToAdd = useMemo(() => {
    const q = pickerQ.trim().toLowerCase();
    const sourceUsers = group?.parentGroupId ? parentPickerUsers : pickerUsers;
    return sourceUsers.filter((u) => !existedIds.has(u.id)).filter((u) => !q || (u.profile?.displayName || "").toLowerCase().includes(q) || (u.profile?.phone || "").toLowerCase().includes(q));
  }, [existedIds, group?.parentGroupId, parentPickerUsers, pickerQ, pickerUsers]);

  const addMember = async (userId: string) => {
    if (!token || !id) return;
    setBusyAdd(true);
    try {
      await addGroupMember(token, id, userId);
      await reload();
    } finally {
      setBusyAdd(false);
    }
  };

  const createChildGroup = async () => {
    if (!token || !id) return;
    if (!childName.trim()) return Alert.alert("Tên nhóm con", "Bạn chưa nhập tên nhóm con.");
    try {
      setCreatingChild(true);
      const child = await createGroup(token, { name: childName.trim(), visibility: "private", parentGroupId: id });
      setPickerOpen(false);
      setChildName("");
      await reload();
      router.push(`/contact/group/${child.id}` as any);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tạo được nhóm con");
    } finally {
      setCreatingChild(false);
    }
  };

  const onKick = (userId: string, name: string) => {
    if (!token || !id) return;
    Alert.alert("Xóa thành viên", `Bạn muốn xóa ${name} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => { await removeGroupMember(token, id, userId); await reload(); } },
    ]);
  };

  const onDeleteChildGroup = (groupId: string, name: string) => {
    if (!token) return;
    Alert.alert("Xóa nhóm", `Bạn muốn xóa ${name}?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => { await deleteGroup(token, groupId); await reload(); } },
    ]);
  };

  const uploadGroupImages = async () => {
    if (!token || !id || !canManage) return;
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) return Alert.alert("Bạn cần cấp quyền thư viện ảnh.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsMultipleSelection: true });
    if (result.canceled) return;
    try {
      setUploadingMedia(true);
      const files = (result.assets || []).map((asset, idx) => ({ uri: asset.uri, name: asset.fileName || imageAssetName(asset.uri, idx), type: asset.mimeType || imageMimeType(asset.fileName || imageAssetName(asset.uri, idx)) }));
      const r = await uploadMedia(token, { scope: "group", ownerId: String(id), kind: "image", files });
      if (r.group) setGroup(r.group);
    } finally {
      setUploadingMedia(false);
    }
  };

  const uploadGroupFiles = async () => {
    if (!token || !id || !canManage) return;
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    try {
      setUploadingMedia(true);
      const files = (result.assets || []).map((asset) => ({ uri: asset.uri, name: asset.name || `file_${Date.now()}`, type: asset.mimeType || "application/octet-stream" }));
      const r = await uploadMedia(token, { scope: "group", ownerId: String(id), kind: "file", files });
      if (r.group) setGroup(r.group);
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeGroupMedia = (kind: "image" | "file", mediaId?: string) => {
    if (!token || !id || !mediaId || !canManage) return;
    Alert.alert("Xóa", "Bạn muốn xóa mục này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => { const r = await deleteMedia(token, { scope: "group", ownerId: String(id), kind, mediaId }); if (r.group) setGroup(r.group); } },
    ]);
  };

  const submitRelationTree = async () => {
    if (!token || !id) return;
    const name = relationName.trim();
    if (!name) return Alert.alert("Tên sơ đồ", "Bạn chưa nhập tên sơ đồ.");
    try {
      setSavingRelation(true);
      if (relationEditorMode === "create") await createGroupRelationshipTree(token, id, { name });
      else if (editingTree) await renameGroupRelationshipTree(token, id, editingTree.id, { name });
      setRelationModalOpen(false);
      setRelationName("");
      setEditingTree(null);
      await loadRelationshipTrees();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không lưu được sơ đồ");
    } finally {
      setSavingRelation(false);
    }
  };

  if (loading) return <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}><View style={{ padding: 16 }}><Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đang tải...</Text></View></Screen>;
  if (err || !group) return <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}><View style={{ padding: 16 }}><Text>{err || "Không tìm thấy nhóm"}</Text></View></Screen>;

  return (
    <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
          <GroupHeaderCard group={group} memberCount={memberCount} onOpenTree={() => router.push(`/contact/group/tree/${group.id}` as any)} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", width: "100%", backgroundColor: "white", padding: 5, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", alignSelf: "stretch" }}>
            <TabPill active={tab === "about"} label="Nhóm" icon="" onPress={() => setTab("about")} />
            <TabPill active={tab === "members"} label="Thành viên" icon="" onPress={() => setTab("members")} />
            <TabPill active={tab === "relations"} label="Quan hệ" icon="" onPress={() => setTab("relations")} />
            <TabPill active={tab === "media"} label="Media" icon="" onPress={() => setTab("media")} />
          </View>
        </View>

        {tab === "about" ? <GroupAboutTab token={token || ""} groupId={String(id || "")} group={group} isOwner={true} onUpdated={reload} onModalOverlayChange={setAboutOverlay} /> : null}

        {tab === "members" ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={card}>
              <View style={{ padding: 12, paddingBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>Thành viên</Text>
                  <Pressable onPress={() => { setPickerMode(membersView === "groups" ? "child" : "user"); setPickerQ(""); setChildName(""); setPickerOpen(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SKY, alignItems: "center", justifyContent: "center" }}><Ionicons name={membersView === "groups" ? "git-branch-outline" : "add"} size={membersView === "groups" ? 18 : 20} color="white" /></Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable onPress={() => setMembersView("groups")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: membersView === "groups" ? SKY : "#F3F4F6" }}><Text style={{ color: membersView === "groups" ? "white" : "#111827", fontWeight: "800" }}>Nhóm</Text></Pressable>
                  <Pressable onPress={() => setMembersView("users")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: membersView === "users" ? SKY : "#F3F4F6" }}><Text style={{ color: membersView === "users" ? "white" : "#111827", fontWeight: "800" }}>Người dùng</Text></Pressable>
                </View>
                <View style={{ marginTop: 10 }}><SearchBar value={membersQ} onChange={setMembersQ} placeholder={membersView === "groups" ? "Tìm nhóm con" : "Tìm người dùng"} /></View>
              </View>
              <Divider />
              <View style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
                {membersView === "groups" ? (filteredChildGroups.length === 0 ? <View style={{ padding: 12 }}><Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có nhóm con nào.</Text></View> : filteredChildGroups.map((item, idx) => <View key={item.id}><GroupRow item={item} memberCount={item.memberIds?.length ?? 0} onPress={() => router.push(`/contact/group/${item.id}` as any)} onDelete={() => onDeleteChildGroup(item.id, item.name)} />{idx !== filteredChildGroups.length - 1 ? <Divider /> : null}</View>)) : (members.length === 0 ? <View style={{ padding: 12 }}><Text style={{ fontSize: 12, color: "#6B7280" }}>Không có thành viên phù hợp.</Text></View> : members.map((item, idx) => { const isMe = item.friend.id === String(user?.id || ""); return <View key={item.friend.id}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><ContactRow item={item.friend} onPress={() => router.push(`/contact/user/${item.friend.id}`)} /></View>{!isMe ? <Pressable onPress={() => onKick(item.friend.id, item.friend.name)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEE2E2" }}><Ionicons name="trash-outline" size={16} color="#B91C1C" /></Pressable> : null}</View>{idx !== members.length - 1 ? <Divider /> : null}</View>; }))}
              </View>
            </View>
          </View>
        ) : null}

        {tab === "relations" ? <GroupRelationsTab items={relationshipTrees} loading={relationshipsLoading} onOpenCreate={() => { setRelationEditorMode("create"); setEditingTree(null); setRelationName(""); setRelationModalOpen(true); }} onRename={(item) => { setRelationEditorMode("rename"); setEditingTree(item); setRelationName(item.name); setRelationModalOpen(true); }} onDelete={(item) => Alert.alert("Xóa sơ đồ", `Bạn muốn xóa sơ đồ "${item.name}"?`, [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: async () => { await deleteGroupRelationshipTree(token || "", id || "", item.id); await loadRelationshipTrees(); } }])} onOpenTree={(item) => router.push(`/contact/group/relationship/${item.id}?groupId=${group.id}` as any)} /> : null}

        {tab === "media" ? (
          <View style={{ gap: 14 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", gap: 8, backgroundColor: "white", padding: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", alignSelf: "flex-start" }}>
                <TabPill active={mediaTab === "images"} label="Ảnh" icon="images-outline" onPress={() => setMediaTab("images")} stretch={false} />
                <TabPill active={mediaTab === "files"} label="Tài liệu" icon="folder-open-outline" onPress={() => setMediaTab("files")} stretch={false} />
              </View>
            </View>
            {mediaTab === "images" ? <GroupImagesPanel images={group.images || []} canManage={canManage} uploading={uploadingMedia} onUpload={uploadGroupImages} onDelete={(mediaId) => removeGroupMedia("image", mediaId)} onPreview={setMediaPreview} /> : <GroupFilesPanel files={group.documents || []} canManage={canManage} uploading={uploadingMedia} onUpload={uploadGroupFiles} onDelete={(mediaId) => removeGroupMedia("file", mediaId)} onPreview={setMediaPreview} />}
          </View>
        ) : null}
      </ScrollView>

      <GroupMediaPreviewModal item={mediaPreview} onClose={() => setMediaPreview(null)} onOpenLink={(url) => openExternalLink(url)} />
      {aboutOverlay}

      <KeyboardSafeModalFrame visible={pickerOpen} onRequestClose={() => setPickerOpen(false)} align="end" padding={0}>
        <Pressable onPress={() => {}} style={{ width: "100%", height: "80%", maxHeight: "80%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
          <View style={{ alignItems: "center", paddingTop: 10 }}><View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} /></View>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>{pickerMode === "user" ? "Thêm người dùng vào nhóm" : "Tạo nhóm con"}</Text><Pressable onPress={() => setPickerOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" }}><Ionicons name="close" size={16} color="#111827" /></Pressable></View>
            <View style={{ flexDirection: "row", gap: 8 }}><Pressable onPress={() => setPickerMode("user")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: pickerMode === "user" ? SKY : "#F3F4F6" }}><Text style={{ color: pickerMode === "user" ? "white" : "#111827", fontWeight: "800" }}>Thêm người dùng</Text></Pressable><Pressable onPress={() => setPickerMode("child")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: pickerMode === "child" ? SKY : "#F3F4F6" }}><Text style={{ color: pickerMode === "child" ? "white" : "#111827", fontWeight: "800" }}>Tạo nhóm con</Text></Pressable></View>
            {pickerMode === "user" ? <View style={{ marginTop: 10 }}><SearchBar value={pickerQ} onChange={setPickerQ} placeholder="Tìm người dùng để thêm" /></View> : <View style={{ marginTop: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}><Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>Tên nhóm con</Text><TextInput value={childName} onChangeText={setChildName} placeholder="Ví dụ: Nhóm Kỹ thuật A" placeholderTextColor="#9CA3AF" style={{ marginTop: 8, fontSize: 14, color: "#111827" }} /></View>}
          </View>
          {pickerMode === "user" ? <FlatList data={candidatesToAdd} keyExtractor={(x) => x.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 32 }} renderItem={({ item }) => <View style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><ContactRow item={toFriend(item, item.id)} onPress={() => router.push(`/contact/user/${item.id}`)} /></View><Pressable disabled={busyAdd} onPress={() => addMember(item.id)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: busyAdd ? "#E5E7EB" : SKY, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={18} color="white" /></Pressable></View>} ItemSeparatorComponent={() => <Divider />} ListEmptyComponent={<View style={{ paddingVertical: 12 }}><Text style={{ fontSize: 12, color: "#6B7280" }}>{pickerLoading ? "Đang tải người dùng..." : "Không còn người dùng nào để thêm."}</Text></View>} /> : <View style={{ padding: 16 }}><Pressable onPress={createChildGroup} disabled={creatingChild} style={{ paddingVertical: 12, borderRadius: 14, backgroundColor: creatingChild ? "#9CA3AF" : SKY, borderWidth: 1, borderColor: creatingChild ? "#9CA3AF" : SKY_DARK, alignItems: "center" }}><Text style={{ color: "white", fontWeight: "900" }}>{creatingChild ? "Đang tạo..." : "Tạo nhóm con"}</Text></Pressable></View>}
        </Pressable>
      </KeyboardSafeModalFrame>

      <KeyboardSafeModalFrame visible={relationModalOpen} onRequestClose={() => setRelationModalOpen(false)} padding={18} backdropColor="rgba(0,0,0,0.35)">
        <View style={{ width: "100%", backgroundColor: "white", borderRadius: 18, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>{relationEditorMode === "create" ? "Tạo sơ đồ quan hệ" : "Đổi tên sơ đồ"}</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>Mỗi sơ đồ chỉ dùng user đang có trong nhóm này.</Text>
          <View style={{ marginTop: 12 }}><Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>Tên sơ đồ</Text><TextInput value={relationName} onChangeText={setRelationName} placeholder="Ví dụ: Sơ đồ nghiên cứu" placeholderTextColor="#9CA3AF" style={{ marginTop: 8, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827" }} /></View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 14 }}><Pressable onPress={() => setRelationModalOpen(false)} style={{ padding: 10, marginRight: 6 }}><Text style={{ fontWeight: "900", color: "#6B7280" }}>Hủy</Text></Pressable><Pressable onPress={submitRelationTree} disabled={savingRelation} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: savingRelation ? "#9CA3AF" : SKY, borderWidth: 1, borderColor: savingRelation ? "#9CA3AF" : SKY_DARK }}><Text style={{ color: "white", fontWeight: "900" }}>{savingRelation ? "Đang lưu..." : relationEditorMode === "create" ? "Tạo sơ đồ" : "Lưu tên"}</Text></Pressable></View>
        </View>
      </KeyboardSafeModalFrame>
    </Screen>
  );
}
