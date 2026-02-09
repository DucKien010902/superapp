import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
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
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

type TabKey = "about" | "members" | "media" | "chat";

function roleLabel(r: "owner" | "admin" | "member") {
  if (r === "owner") return "Owner";
  if (r === "admin") return "Admin";
  return "Member";
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "blue" | "red";
}) {
  const bg =
    tone === "blue"
      ? "#DBEAFE"
      : tone === "red"
      ? "#FEE2E2"
      : "#F3F4F6";
  const fg =
    tone === "blue"
      ? "#1D4ED8"
      : tone === "red"
      ? "#B91C1C"
      : "#374151";
  return (
    <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: "900", color: fg }}>{label}</Text>
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
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: active ? "#111827" : "transparent",
      }}
    >
      <Ionicons name={icon} size={16} color={active ? "white" : "#6B7280"} />
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "white" : "#6B7280" }}>
        {label}
      </Text>
    </Pressable>
  );
}

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

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [tab, setTab] = useState<TabKey>("about");

  const [meFriend, setMeFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberRows, setMemberRows] = useState<Array<{ userId: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Add-member picker UI
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [busyAdd, setBusyAdd] = useState(false);

  const reload = async () => {
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
      setErr(e?.message || "Load error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id, token]);

  const myRole = (group?.myRole || "member") as "owner" | "admin" | "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const friendsMap = useMemo(() => {
    const all = meFriend ? [meFriend, ...friends] : friends;
    return new Map(all.map((f) => [f.id, f]));
  }, [friends, meFriend]);

  const members = useMemo(() => {
    return memberRows
      .map((m) => {
        const f = friendsMap.get(m.userId);
        if (!f) return null;
        return { friend: f, role: m.role as "owner" | "admin" | "member" };
      })
      .filter(Boolean) as Array<{ friend: Friend; role: "owner" | "admin" | "member" }>;
  }, [memberRows, friendsMap]);

  const memberCount = memberRows?.length || group?.memberIds?.length || 0;

  const onKick = async (userId: string) => {
    if (!token || !id) return;
    await removeGroupMember(token, id, userId);
    await reload();
  };

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

  if (loading) {
    return (
      <Screen style={{ backgroundColor: "#F3F4F6" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đang tải…</Text>
        </View>
      </Screen>
    );
  }

  if (err) {
    return (
      <Screen style={{ backgroundColor: "#F3F4F6" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Không vào được nhóm</Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{err}</Text>
              <Pressable
                onPress={reload}
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: "#1877F2",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Tải lại</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen style={{ backgroundColor: "#F3F4F6" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Không tìm thấy nhóm</Text>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "#F3F4F6" }} top={12} bottom={0}>
      {/* ===== Header card ===== */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
        <Card>
          <View style={{ padding: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827" }}>{group.name}</Text>

            <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pill label={`${memberCount} thành viên`} tone="neutral" />
              <Pill label={`Vai trò: ${roleLabel(myRole)}`} tone="blue" />
              <Pill label={group.visibility === "public" ? "Public" : "Private"} tone="neutral" />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Mô tả</Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: "#111827", lineHeight: 18 }}>
                {group.description?.trim() ? group.description : "Chưa có mô tả."}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* ===== Tabs ===== */}
      <View style={{ paddingHorizontal: 0, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            backgroundColor: "white",
            padding: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            alignSelf: "flex-start",
            margin:'auto'
          }}
        >
          <TabPill active={tab === "about"} label="Nhóm" icon="information-circle-outline" onPress={() => setTab("about")} />
          <TabPill active={tab === "members"} label="Thành viên" icon="people-outline" onPress={() => setTab("members")} />
          <TabPill active={tab === "media"} label="Tài liệu" icon="folder-outline" onPress={() => setTab("media")} />
          <TabPill active={tab === "chat"} label="Chat" icon="chatbubble-ellipses-outline" onPress={() => setTab("chat")} />
        </View>
      </View>

      {/* ===== Content ===== */}
      {tab === "about" && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <SectionTitle icon="megaphone-outline" title="Thông báo" />
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                (Bạn sẽ làm: admin đăng thông báo, pin thông báo, lịch sử thông báo)
              </Text>
            </View>
          </Card>

          {canManage && (
            <Pressable
              onPress={() => {
                // TODO: mở màn chỉnh sửa nhóm
              }}
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: "#1877F2",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Chỉnh sửa thông tin nhóm</Text>
            </Pressable>
          )}
        </View>
      )}

      {tab === "members" && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* Add members */}
          {canManage && (
            <View style={{ paddingTop: 6, paddingBottom: 12 }}>
              <Pressable
                onPress={() => setPickerOpen((v) => !v)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 14,
                      backgroundColor: "#DBEAFE",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person-add-outline" size={18} color="#1D4ED8" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#111827" }}>Thêm thành viên</Text>
                    <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                      Chọn trong danh sách bạn bè (chưa ở trong nhóm)
                    </Text>
                  </View>
                </View>

                <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
              </Pressable>

              {pickerOpen && (
                <View style={{ marginTop: 10 }}>
                  <Card>
                    <View style={{ padding: 12 }}>
                      <TextInput
                        value={pickerQ}
                        onChangeText={setPickerQ}
                        placeholder="Tìm bạn bè..."
                        placeholderTextColor="#9CA3AF"
                        style={{
                          height: 42,
                          borderRadius: 14,
                          backgroundColor: "#F9FAFB",
                          paddingHorizontal: 12,
                          fontSize: 13,
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          color: "#111827",
                        }}
                      />
                      <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
                        {candidatesToAdd.length} người có thể thêm
                      </Text>
                    </View>

                    <Divider />

                    {candidatesToAdd.length === 0 ? (
                      <View style={{ padding: 12 }}>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          Không còn bạn bè nào để thêm.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ paddingVertical: 6 }}>
                        {candidatesToAdd.slice(0, 20).map((f) => (
                          <View key={f.id} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <ContactRow item={f} />
                              </View>

                              <Pressable
                                disabled={busyAdd}
                                onPress={() => addMember(f.id)}
                                style={{
                                  paddingVertical: 9,
                                  paddingHorizontal: 12,
                                  borderRadius: 999,
                                  backgroundColor: busyAdd ? "#E5E7EB" : "#111827",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <Ionicons name="add" size={16} color="white" />
                                <Text style={{ color: "white", fontSize: 12, fontWeight: "900" }}>
                                  Thêm
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}

                        {candidatesToAdd.length > 20 && (
                          <View style={{ padding: 12 }}>
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              (Đang hiển thị 20 người đầu — dùng search để lọc)
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                </View>
              )}
            </View>
          )}

          <SectionTitle icon="people-outline" title="Danh sách thành viên" />

          <FlatList
            contentContainerStyle={{ paddingBottom: 24 }}
            data={members}
            keyExtractor={(x) => x.friend.id}
            renderItem={({ item }) => {
              const isMe = meFriend?.id === item.friend.id;

              const canKick =
                canManage &&
                item.role !== "owner" &&
                !(myRole === "admin" && item.role === "admin") &&
                !isMe;

              return (
                <View style={{ marginBottom: 10 }}>
                  <Card>
                    <View style={{ padding: 12 }}>
                      <ContactRow item={item.friend} />

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingTop: 10,
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                          <Pill label={roleLabel(item.role)} tone={item.role === "owner" ? "blue" : "neutral"} />
                          {isMe && <Pill label="Bạn" tone="neutral" />}
                        </View>

                        {canKick && (
                          <Pressable
                            onPress={() => onKick(item.friend.id)}
                            style={{
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 999,
                              backgroundColor: "#FEE2E2",
                              borderWidth: 1,
                              borderColor: "#FCA5A5",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                            <Text style={{ fontSize: 12, fontWeight: "900", color: "#B91C1C" }}>
                              Xóa
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Card>
                </View>
              );
            }}
            ListEmptyComponent={
              <Card>
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    Không tải được danh sách thành viên (thiếu dữ liệu friends). Nếu muốn hiển thị đầy đủ mọi user,
                    cần API trả profile user cho members.
                  </Text>
                </View>
              </Card>
            }
          />
        </View>
      )}

      {tab === "media" && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <SectionTitle icon="images-outline" title="Ảnh" />
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                (Bạn sẽ làm: upload ảnh, hiển thị grid, xem full)
              </Text>
            </View>
          </Card>

          <View style={{ height: 12 }} />

          <SectionTitle icon="document-text-outline" title="Tài liệu" />
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                (Bạn sẽ làm: upload file, list file, preview/download)
              </Text>
            </View>
          </Card>
        </View>
      )}

      {tab === "chat" && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <SectionTitle icon="chatbubble-ellipses-outline" title="Chat nhóm" />

          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>
                (UI trước, logic sau: tạo conversationId cho group, fetch messages, send message, unread, typing…)
              </Text>

              <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" }}>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>Gợi ý routes backend:</Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: "#374151", lineHeight: 18 }}>
                  • POST /api/messages/group/:groupId{"\n"}
                  • GET /api/messages/:conversationId{"\n"}
                  • POST /api/messages/:conversationId
                </Text>
              </View>
            </View>
          </Card>

          <Pressable
            onPress={() => {
              // TODO: sau này push sang màn chat nhóm
            }}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: "#1877F2",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Mở chat nhóm</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
