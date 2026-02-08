import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import { useAuth } from "@/lib/auth";
import {
  addGroupMember,
  fetchFriends,
  fetchGroupById,
  fetchGroupMembers,
  removeGroupMember,
} from "@/lib/contact/api";
import type { Friend, Group } from "@/lib/contact/types";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

type TabKey = "about" | "members" | "media";

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: "900", color: active ? "#111827" : "#6B7280" }}>
        {label}
      </Text>
      <View
        style={{
          marginTop: 6,
          height: 2,
          backgroundColor: active ? "#111827" : "transparent",
          borderRadius: 999,
        }}
      />
    </Pressable>
  );
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [tab, setTab] = useState<TabKey>("about");

  const [friends, setFriends] = useState<Friend[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberRows, setMemberRows] = useState<Array<{ userId: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    if (!token || !id) return;
    setErr(null);
    setLoading(true);
    try {
      const [fs, g, ms] = await Promise.all([
        fetchFriends(token),
        fetchGroupById(token, id),
        fetchGroupMembers(token, id),
      ]);
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

  const friendsMap = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  const members = useMemo(() => {
    // map memberRows -> Friend nếu có trong danh bạ/bạn bè
    // (nếu bạn muốn hiển thị cả user không phải friend thì cần API trả profile user; hiện tại bạn yêu cầu chỉ add friend, nên ok)
    return memberRows
      .map((m) => {
        const f = friendsMap.get(m.userId);
        if (!f) return null;
        return { friend: f, role: m.role as "owner" | "admin" | "member" };
      })
      .filter(Boolean) as Array<{ friend: Friend; role: "owner" | "admin" | "member" }>;
  }, [memberRows, friendsMap]);

  const myRole = group?.myRole || "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const onKick = async (userId: string) => {
    if (!token || !id) return;
    await removeGroupMember(token, id, userId);
    await reload();
  };

  const onAddFirstFriendNotInGroup = async () => {
    if (!token || !id || !group) return;
    // demo: add nhanh 1 bạn chưa có trong group
    const existed = new Set(group.memberIds || []);
    const candidate = friends.find((f) => !existed.has(f.id));
    if (!candidate) return;

    await addGroupMember(token, id, candidate.id);
    await reload();
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: "white" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Đang tải...</Text>
        </View>
      </Screen>
    );
  }

  if (err) {
    return (
      <Screen style={{ backgroundColor: "white" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>Không vào được nhóm</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{err}</Text>
          <Pressable onPress={reload} style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "900", color: "#2563EB" }}>Tải lại</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen style={{ backgroundColor: "white" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>Không tìm thấy nhóm</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "white" }} top={12} bottom={0}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#111827" }}>{group.name}</Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
          {(group.memberIds?.length ?? 0)} thành viên • Vai trò của bạn: {group.myRole}
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <TabButton active={tab === "about"} label="Nhóm" onPress={() => setTab("about")} />
        <TabButton active={tab === "members"} label="Thành viên" onPress={() => setTab("members")} />
        <TabButton active={tab === "media"} label="Ảnh + Tài liệu" onPress={() => setTab("media")} />
      </View>

      {/* Content */}
      {tab === "about" && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: "#111827" }}>Mô tả</Text>
          <Text style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
            {group.description?.trim() ? group.description : "Chưa có mô tả."}
          </Text>

          {canManage && (
            <Pressable onPress={onAddFirstFriendNotInGroup} style={{ marginTop: 16 }}>
              <Text style={{ fontWeight: "900", color: "#2563EB" }}>+ Add nhanh 1 bạn (demo)</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                (Bạn sẽ thay bằng màn hình chọn bạn bè để add)
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {tab === "members" && (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          data={members}
          keyExtractor={(x) => x.friend.id}
          renderItem={({ item }) => {
            const canKick =
              canManage &&
              item.role !== "owner" &&
              !(myRole === "admin" && item.role === "admin"); // admin không kick admin khác

            return (
              <View>
                <ContactRow item={item.friend} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Vai trò: {item.role}</Text>
                  {canKick && (
                    <Pressable onPress={() => onKick(item.friend.id)}>
                      <Text style={{ fontSize: 12, fontWeight: "900", color: "#DC2626" }}>Xóa khỏi nhóm</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />}
        />
      )}

      {tab === "media" && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: "#111827" }}>Ảnh</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
            (Bạn sẽ làm: upload ảnh, hiển thị grid, xem full)
          </Text>

          <Text style={{ marginTop: 16, fontSize: 13, fontWeight: "900", color: "#111827" }}>Tài liệu</Text>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
            (Bạn sẽ làm: upload file, list file, preview/download)
          </Text>
        </View>
      )}
    </Screen>
  );
}
