import ContactRow from "@/components/contact/ContactRow";
import CreateFriendModal from "@/components/contact/CreateFriendModal";
import SearchBar from "@/components/contact/SearchBar";
import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { fetchFriends, searchUsers } from "@/lib/contact/api";
import type { Friend, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

type Row =
  | { kind: "friend"; friend: Friend }
  | { kind: "user"; user: UserPublic };

const FIRST_PAGE = 5;
const MORE_PAGE = 10; // tối đa thêm 5 nữa => tổng 10

export default function ContactsScreen() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);

  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const [searchLimit, setSearchLimit] = useState(FIRST_PAGE); // 5 -> 10
  const lastReqId = useRef(0);

  const [createOpen, setCreateOpen] = useState(false);

  const isSearching = !!q.trim();
  const isAdmin = String(user?.role || "") === "admin";

  const loadFriends = useCallback(async () => {
    if (!token) return;
    try {
      setFriendsLoading(true);
      const items = await fetchFriends(token);
      setFriends(items);
    } finally {
      setFriendsLoading(false);
    }
  }, [token]);

  // load friends
  useEffect(() => {
    if (!token) return;
    loadFriends();
  }, [token, loadFriends]);

  // reset limit khi đổi query
  useEffect(() => {
    if (!isSearching) {
      setUsers([]);
      setSearchLimit(FIRST_PAGE);
      return;
    }
    setSearchLimit(FIRST_PAGE);
  }, [isSearching, q]);

  // search all users (debounce)
  useEffect(() => {
    if (!token) return;

    const s = q.trim();
    if (!s) {
      setUsers([]);
      return;
    }

    const reqId = ++lastReqId.current;

    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const items = await searchUsers(token, s, {
          limit: searchLimit,
          skip: 0,
        });

        // tránh race condition khi gõ nhanh
        if (reqId !== lastReqId.current) return;

        setUsers(items);
      } catch {
        if (reqId !== lastReqId.current) return;
        setUsers([]);
      } finally {
        if (reqId === lastReqId.current) setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, token, searchLimit]);

  const rows: Row[] = useMemo(() => {
    if (!isSearching)
      return friends.map((f) => ({ kind: "friend", friend: f }));
    return users.map((u) => ({ kind: "user", user: u }));
  }, [isSearching, friends, users]);

  // logic See more
  const canSeeMore =
    isSearching &&
    !searchLoading &&
    searchLimit === FIRST_PAGE &&
    users.length === FIRST_PAGE; // chỉ hiện khi đủ 5 (ngầm hiểu còn kết quả)

  const Footer = () => {
    if (!isSearching) return null;

    // Loading nhỏ ở footer
    if (searchLoading) {
      return (
        <View style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ color: "#6B7280" }}>Đang tìm...</Text>
        </View>
      );
    }

    if (!canSeeMore) return <View style={{ height: 24 }} />;

    return (
      <View style={{ paddingTop: 10, paddingBottom: 24, alignItems: "center" }}>
        <Pressable
          onPress={() => setSearchLimit(MORE_PAGE)} // chỉ nhảy 5 -> 10
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: "#111827",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>See more</Text>
        </Pressable>
        <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
          Tối đa thêm 5 kết quả nữa
        </Text>
      </View>
    );
  };

  const headerCountText = (() => {
    if (!isSearching)
      return friendsLoading ? "Đang tải..." : `${rows.length} mục`;
    if (searchLoading && users.length === 0) return "Đang tìm...";
    // đang search: hiển thị số đang có / giới hạn (5 hoặc 10)
    return `${rows.length} / ${searchLimit} kết quả`;
  })();

  return (
    <Screen top={8} bottom={0}>
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search name / phone"
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {/* Header row: title + (admin) */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
            {isSearching ? "Kết quả " : "Bạn bè"}
          </Text>

          {/* ✅ chỉ admin và chỉ khi đang ở tab Bạn bè (không search) */}
          {isAdmin && !isSearching ? (
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#1340a1",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={20} color="white" />
            </Pressable>
          ) : null}
        </View>

        <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
          {headerCountText}
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 120,
        }}
        data={rows}
        keyExtractor={(it) =>
          it.kind === "friend" ? it.friend.id : it.user.id
        }
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
        ListFooterComponent={Footer}
      />

      {/* ✅ Modal tạo bạn mới (admin) */}
      {token ? (
        <CreateFriendModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          token={token}
          onCreated={() => {
            // tạo xong: refresh list friends, reset search nếu muốn
            setQ("");
            loadFriends();
          }}
        />
      ) : null}
    </Screen>
  );
}