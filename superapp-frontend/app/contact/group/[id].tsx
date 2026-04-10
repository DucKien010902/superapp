import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import SearchBar from "@/components/contact/SearchBar";
import GroupAboutTab from "@/components/contact/group/GroupAboutTab";
import { useAuth } from "@/lib/auth";
import {
  addGroupMember,
  fetchFriends,
  fetchGroupById,
  fetchGroupMembers,
  fetchMe,
  removeGroupMember,
} from "@/lib/contact/api";
import type { Friend, Group } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type TabKey = "about" | "members" | "images" | "media";

const DEMO_GROUP_IMAGES = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
];

const DEMO_GROUP_FILES = [
  { id: "gf1", name: "Ke_hoach_hoat_dong_quy_2.docx", meta: "Word • 1.8 MB • 03/04/2026", icon: "document-text-outline" as const },
  { id: "gf2", name: "Anh_su_kien_thang_3.zip", meta: "ZIP • 24 MB • 08/04/2026", icon: "folder-open-outline" as const },
  { id: "gf3", name: "Bang_phan_cong.xlsx", meta: "Excel • 680 KB • 09/04/2026", icon: "grid-outline" as const },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />;
}

function FileRow({ icon, name, meta }: { icon: any; name: string; meta: string }) {
  return (
    <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color="#111827" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{name}</Text>
        <Text style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: "#DBEAFE",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Ionicons name={icon} size={18} color="#1D4ED8" />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>{title}</Text>
    </View>
  );
}

function TabPill({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: active ? "#3B82F6" : "transparent",
      }}
    >
      <Ionicons name={icon} size={16} color={active ? "white" : "#6B7280"} />
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "white" : "#6B7280" }}>{label}</Text>
    </Pressable>
  );
}

function GroupHeader({ group, memberCount }: { group: Group; memberCount: number }) {
  return (
    <Card>
      <View style={{ padding: 14, backgroundColor: "#EEF4FF" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "#DBEAFE",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people-outline" size={22} color="#1D4ED8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: "900", color: "#0F172A" }}>{group.name}</Text>
            <Text style={{ marginTop: 2, color: "#475569", fontSize: 12 }}>
              {memberCount} thành viên • {group.visibility === "public" ? "Công khai" : "Riêng tư"}
            </Text>
          </View>
        </View>
      </View>

      <Divider />

      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "700" }}>Mô tả nhóm</Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: "#111827", lineHeight: 19 }}>
          {group.description?.trim() ? group.description : "Chưa có mô tả."}
        </Text>
      </View>
    </Card>
  );
}

function MediaTabPlaceholder({ files }: { files: Group["documents"] }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle icon="folder-open-outline" title="Tài liệu nhóm" />
      <Card>
        <Pressable
          onPress={() => Alert.alert("Thêm file", "Chức năng thêm file sẽ nối logic sau.")}
          style={{
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: "#F8FBFF",
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: "#DBEAFE",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={22} color="#1D4ED8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>Thêm file</Text>
            <Text style={{ marginTop: 2, color: "#6B7280", fontSize: 12 }}>
              Tạo file demo mới hoặc nối upload sau
            </Text>
          </View>
        </Pressable>
        <Divider />
        {files?.map((file, idx) => (
          <View key={file.id || `${file.url}-${idx}`}>
            <FileRow
              icon="document-text-outline"
              name={file.name || "Untitled"}
              meta={`${Number(file.size || 0) > 0 ? `${Math.round(Number(file.size || 0) / 1024)} KB` : "-"} • ${
                file.createdAt ? new Date(file.createdAt).toLocaleDateString("vi-VN") : "-"
              }`}
            />
            {idx !== (files?.length || 0) - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

function ImagesTabPlaceholder({ images }: { images: Group["images"] }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle icon="images-outline" title="Ảnh nhóm" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Pressable
          onPress={() => Alert.alert("Thêm ảnh", "Chức năng thêm ảnh sẽ nối logic sau.")}
          style={{
            width: "31%",
            aspectRatio: 1,
            borderRadius: 18,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: "#93C5FD",
            backgroundColor: "#EFF6FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={28} color="#2563EB" />
          <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "800", color: "#1D4ED8" }}>
            Thêm
          </Text>
        </Pressable>

        {images?.map((item, idx) => (
          <View
            key={`${item.url}-${idx}`}
            style={{
              width: "31%",
              aspectRatio: 1,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
            }}
          >
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("about");
  const [meFriend, setMeFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberRows, setMemberRows] = useState<{ userId: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [membersQ, setMembersQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [busyAdd, setBusyAdd] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    setErr(null);
    setLoading(true);
    try {
      const [me, fs, g, ms] = await Promise.all([
        fetchMe(token),
        fetchFriends(token),
        fetchGroupById(token, id),
        fetchGroupMembers(token, id),
      ]);

      const meAsFriend: Friend = {
        id: me.id,
        name: me.profile?.displayName || "Bạn",
        phone: me.profile?.phone || "",
        avatar: me.profile?.avatarUrl || "",
        isOnline: false,
      };

      setMeFriend(meAsFriend);
      setFriends(fs);
      setGroup(g);
      setMemberRows(ms.items || []);
    } catch (e: any) {
      setErr(e?.message || "Không tải được chi tiết nhóm");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const myRole = (group?.myRole || "member") as "owner" | "admin" | "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const friendsMap = useMemo(() => {
    const all = meFriend ? [meFriend, ...friends] : friends;
    return new Map(all.map((f) => [f.id, f]));
  }, [friends, meFriend]);

  const members = useMemo(() => {
    const q = membersQ.trim().toLowerCase();
    return memberRows
      .map((m) => {
        const f = friendsMap.get(m.userId);
        const friend: Friend =
          f || {
            id: m.userId,
            name: `Người dùng ${String(m.userId).slice(-4)}`,
            phone: "",
            avatar: "",
          };
        return { friend, role: m.role as "owner" | "admin" | "member" };
      })
      .filter((x) => {
        if (!q) return true;
        return x.friend.name.toLowerCase().includes(q) || (x.friend.phone || "").toLowerCase().includes(q);
      });
  }, [memberRows, friendsMap, membersQ]);

  const existedIds = useMemo(() => new Set(memberRows.map((m) => m.userId)), [memberRows]);

  const candidatesToAdd = useMemo(() => {
    const q = pickerQ.trim().toLowerCase();
    return friends
      .filter((f) => !existedIds.has(f.id))
      .filter((f) => {
        if (!q) return true;
        return f.name?.toLowerCase().includes(q) || (f.phone || "").toLowerCase().includes(q);
      });
  }, [friends, existedIds, pickerQ]);

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

  const onKick = async (userId: string, name: string) => {
    if (!token || !id) return;
    Alert.alert("Xóa thành viên", `Bạn muốn xóa ${name} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await removeGroupMember(token, id, userId);
          await reload();
        },
      },
    ]);
  };

  const memberCount = memberRows?.length || group?.memberIds?.length || 0;

  if (loading) {
    return (
      <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đang tải...</Text>
        </View>
      </Screen>
    );
  }

  if (err || !group) {
    return (
      <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Không vào được nhóm</Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{err || "Không tìm thấy nhóm"}</Text>
              <Pressable onPress={reload} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: "#1877F2", alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "900" }}>Tải lại</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
          <GroupHeader group={group} memberCount={memberCount} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: "white", padding: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", alignSelf: "flex-start" }}>
            <TabPill active={tab === "about"} label="Nhóm" icon="information-circle-outline" onPress={() => setTab("about")} />
            <TabPill active={tab === "members"} label="Thành viên" icon="people-outline" onPress={() => setTab("members")} />
            <TabPill active={tab === "images"} label="Ảnh" icon="images-outline" onPress={() => setTab("images")} />
            <TabPill active={tab === "media"} label="Tài liệu" icon="folder-outline" onPress={() => setTab("media")} />
          </View>
        </View>

        {tab === "about" ? (
          <GroupAboutTab
            token={token || ""}
            groupId={String(id || "")}
            group={group}
            isOwner={myRole === "owner"}
            onUpdated={reload}
          />
        ) : tab === "members" ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Card>
              <View style={{ padding: 12, paddingBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>Danh sách thành viên</Text>
                  {canManage ? (
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1877F2", alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </Pressable>
                  ) : null}
                </View>

                <View style={{ marginTop: 10 }}>
                  <SearchBar value={membersQ} onChange={setMembersQ} placeholder="Tìm thành viên theo tên / SĐT" />
                </View>
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{members.length} kết quả</Text>
              </View>

              <Divider />

              {members.length === 0 ? (
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Không có thành viên phù hợp.</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
                  {members.map((item, idx) => {
                    const isMe = meFriend?.id === item.friend.id;
                    const canKick = canManage && item.role !== "owner" && !isMe && !(myRole === "admin" && item.role === "admin");
                    return (
                      <View key={item.friend.id}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <ContactRow item={item.friend} onPress={() => router.push(`/contact/user/${item.friend.id}`)} />
                          </View>
                          {canKick ? (
                            <Pressable onPress={() => onKick(item.friend.id, item.friend.name)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEE2E2" }}>
                              <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                            </Pressable>
                          ) : null}
                        </View>
                        {idx !== members.length - 1 ? <Divider /> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        ) : tab === "images" ? (
          <ImagesTabPlaceholder images={group.images || []} />
        ) : (
          <MediaTabPlaceholder files={group.documents || []} />
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable onPress={() => setPickerOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable onPress={() => {}} style={{ maxHeight: "90%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
              <View style={{ alignItems: "center", paddingTop: 10 }}>
                <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Thêm thành viên</Text>
                  <Pressable onPress={() => setPickerOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" }}>
                    <Ionicons name="close" size={16} color="#111827" />
                  </Pressable>
                </View>
                <SearchBar value={pickerQ} onChange={setPickerQ} placeholder="Tìm bạn bè để thêm" />
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{candidatesToAdd.length} người có thể thêm</Text>
              </View>

              <FlatList
                data={candidatesToAdd}
                keyExtractor={(x) => x.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ContactRow item={item} onPress={() => router.push(`/contact/user/${item.id}`)} />
                    </View>
                    <Pressable
                      disabled={busyAdd}
                      onPress={() => addMember(item.id)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: busyAdd ? "#E5E7EB" : "#1877F2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={18} color="white" />
                    </Pressable>
                  </View>
                )}
                ItemSeparatorComponent={() => <Divider />}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Không còn bạn bè nào để thêm.</Text>
                  </View>
                }
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Screen>
  );
}
