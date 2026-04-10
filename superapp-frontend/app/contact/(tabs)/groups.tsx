import Screen from "@/components/Screen";
import GroupRow from "@/components/contact/GroupRow";
import SearchBar from "@/components/contact/SearchBar";
import { useAuth } from "@/lib/auth";
import { createGroup, fetchFriends, fetchGroups } from "@/lib/contact/api";
import type { Friend, Group } from "@/lib/contact/types";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function GroupsScreen() {
  const { token } = useAuth();

  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // create group modal
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [fs, gs] = await Promise.all([
        fetchFriends(token),
        fetchGroups(token),
      ]);
      setFriends(fs);
      setGroups(gs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter((g) => (g.name || "").toLowerCase().includes(s));
  }, [q, groups]);

  // ✅ đếm đúng tổng member (backend trả memberIds của group)
  const memberCount = (g: Group) => g.memberIds?.length ?? 0;

  // NOTE: isHidden hiện chỉ là “local UI”, chưa lưu server
  const toggleHidden = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isHidden: !g.isHidden } : g)),
    );
  };

  const onOpenCreate = () => {
    setCreateErr(null);
    setNewName("");
    setOpenCreate(true);
  };

  const onCreate = async () => {
    if (!token) return;
    const name = newName.trim();
    if (!name) {
      setCreateErr("Bạn chưa nhập tên nhóm");
      return;
    }

    setCreating(true);
    setCreateErr(null);
    try {
      const g = await createGroup(token, { name, visibility: "private" });

      // ✅ thêm ngay vào đầu list (tức là “nhóm mình tạo” sẽ hiện liền)
      setGroups((prev) => [g, ...prev]);

      setOpenCreate(false);
      // tuỳ bạn: vào luôn detail nhóm mới
      router.push(`/contact/group/${g.id}` as any);
    } catch (e: any) {
      setCreateErr(e?.message || "Tạo nhóm thất bại");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: "white" }} top={8}>
      {/* Header + Create */}
      <View
        style={{
          paddingHorizontal: 16,
          marginTop: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <SearchBar value={q} onChange={setQ} placeholder="Tìm nhóm..." />
        </View>

        <Pressable
          onPress={onOpenCreate}
          style={{
            marginLeft: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: "#1340a1",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
            + Tạo
          </Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
          Nhóm
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
          {loading ? "Đang tải..." : `${filtered.length} nhóm`}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 24,
        }}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GroupRow
            item={item}
            memberCount={memberCount(item)}
            onToggleHidden={() => toggleHidden(item.id)}
            onPress={() => router.push(`/contact/group/${item.id}` as any)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        )}
      />

      {/* Create Group Modal */}
      <Modal
        visible={openCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenCreate(false)}
      >
        <Pressable
          onPress={() => setOpenCreate(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: "white", borderRadius: 18, padding: 14 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
              Tạo nhóm mới
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
              Nhóm tạo xong bạn sẽ là Owner và tự động là thành viên.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Text
                style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}
              >
                Tên nhóm
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Ví dụ: Team Dự án"
                placeholderTextColor="#9CA3AF"
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: "#111827",
                }}
              />
              {!!createErr && (
                <Text style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>
                  {createErr}
                </Text>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <Pressable
                onPress={() => setOpenCreate(false)}
                style={{ padding: 10, marginRight: 6 }}
              >
                <Text style={{ fontWeight: "900", color: "#6B7280" }}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={onCreate}
                disabled={creating}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: creating ? "#9CA3AF" : "#111827",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {creating ? "Đang tạo..." : "Tạo nhóm"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
