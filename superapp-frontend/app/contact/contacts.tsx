import ContactRow from "@/components/contact/ContactRow";
import SearchBar from "@/components/contact/SearchBar";
import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth"; // bạn đã có
import { fetchFriends, searchUsers } from "@/lib/contact/api";
import type { Friend, UserPublic } from "@/lib/contact/types";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

type Row = { kind: "friend"; friend: Friend } | { kind: "user"; user: UserPublic };

export default function ContactsScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const items = await fetchFriends(token);
        setFriends(items);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const s = q.trim();
    if (!s) {
      setUsers([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const items = await searchUsers(token, s);
        setUsers(items);
      } catch {
        setUsers([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, token]);

  const rows: Row[] = useMemo(() => {
    const s = q.trim();
    if (!s) return friends.map((f) => ({ kind: "friend", friend: f }));
    // khi search: ưu tiên list users (toàn hệ thống)
    return users.map((u) => ({ kind: "user", user: u }));
  }, [q, friends, users]);

  return (
    <Screen top={8} bottom={0}>
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search contacts" />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
          {q.trim() ? "Kết quả" : "Bạn bè"}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
          {loading ? "Đang tải..." : `${rows.length} mục`}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 120, // ✅ tránh bị tab bar che
        }}
        data={rows}
        keyExtractor={(it) => (it.kind === "friend" ? it.friend.id : it.user.id)}
        renderItem={({ item }) => {
          if (item.kind === "friend") {
            return (
              <ContactRow
                item={item.friend}
                onPress={() => router.push(`/contact/user/${item.friend.id}`)}
              />
            );
          }
          const u = item.user;
          return (
            <ContactRow
              item={{
                id: u.id,
                name: u.profile?.displayName || "—",
                phone: u.profile?.phone || "",
                avatar: u.profile?.avatarUrl || "",
              }}
              onPress={() => router.push(`/contact/user/${u.id}`)}
            />
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        )}
      />
    </Screen>
  );
}
