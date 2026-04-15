import ContactRow from "@/components/contact/ContactRow";
import CreateFriendModal from "@/components/contact/CreateFriendModal";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import SearchBar from "@/components/contact/SearchBar";
import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { searchUsers } from "@/lib/contact/api";
import type { Friend, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const PAGE_SIZE = 6;

const FIELD_OPTIONS = [
  { key: "phone", label: "Số điện thoại" },
  { key: "username", label: "Username" },
  { key: "bio", label: "Tiểu sử" },
  { key: "note", label: "Ghi chú" },
  { key: "gender", label: "Giới tính" },
  { key: "birthday", label: "Ngày sinh" },
  { key: "work", label: "Công việc" },
  { key: "education", label: "Học vấn" },
  { key: "city", label: "Thành phố" },
  { key: "country", label: "Quốc gia" },
] as const;

type SecondaryFieldKey = (typeof FIELD_OPTIONS)[number]["key"];

function pickProfileField(user: UserPublic, field: SecondaryFieldKey) {
  const profile = user.profile || {};
  if (field === "phone") return profile.phone || "";
  if (field === "username") return profile.username || "";
  if (field === "bio") return profile.bio || "";
  if (field === "note") return profile.note || "";
  if (field === "gender") return profile.gender || "";
  if (field === "birthday") return profile.birthday || "";
  if (field === "work") return profile.work || "";
  if (field === "education") return profile.education || "";
  if (field === "city") return profile.location?.city || "";
  if (field === "country") return profile.location?.country || "";
  return "";
}

function toContactItem(user: UserPublic, selectedFields: SecondaryFieldKey[]): Friend {
  const secondaryLines = selectedFields
    .map((field) => pickProfileField(user, field))
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return {
    id: user.id,
    name: user.profile?.displayName || "-",
    phone: user.profile?.phone || "",
    avatar: user.profile?.avatarUrl || "",
    secondaryLines,
  };
}

function FieldPickerModal({
  open,
  selectedFields,
  onToggle,
  onClose,
}: {
  open: boolean;
  selectedFields: SecondaryFieldKey[];
  onToggle: (field: SecondaryFieldKey) => void;
  onClose: () => void;
}) {
  return (
    <KeyboardSafeModalFrame visible={open} onRequestClose={onClose}>
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "70%",
          borderRadius: 22,
          backgroundColor: "white",
          padding: 16,
          borderWidth: 1,
          borderColor: "rgba(229,231,235,0.9)",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
              Trường hiển thị phụ
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
              Chọn các trường trong profile và SĐT để ghim dưới tên.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={18} color="#111827" />
          </Pressable>
        </View>

        <ScrollView
          style={{ marginTop: 14 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {FIELD_OPTIONS.map((option) => {
            const active = selectedFields.includes(option.key);
            return (
              <Pressable
                key={option.key}
                onPress={() => onToggle(option.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active ? SKY_DARK : "#E5E7EB",
                  backgroundColor: active ? "#E0F2FE" : "#F9FAFB",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
                  {option.label}
                </Text>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? SKY : "transparent",
                    borderWidth: active ? 0 : 1,
                    borderColor: "#CBD5E1",
                  }}
                >
                  {active ? <Ionicons name="checkmark" size={14} color="white" /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </KeyboardSafeModalFrame>
  );
}

export default function ContactsScreen() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<SecondaryFieldKey[]>([
    "phone",
    "work",
    "note",
  ]);
  const lastReqId = useRef(0);

  const isAdmin = String(user?.role || "") === "admin";

  const loadUsers = useCallback(
    async (mode: "replace" | "append", skipOverride = 0) => {
      if (!token) return;

      const reqId = ++lastReqId.current;
      const nextSkip = mode === "append" ? skipOverride : 0;

      if (mode === "append") setLoadingMore(true);
      else setLoading(true);

      try {
        const items = await searchUsers(token, q.trim(), {
          limit: PAGE_SIZE,
          skip: nextSkip,
        });

        if (reqId !== lastReqId.current) return;

        setUsers((prev) => (mode === "append" ? [...prev, ...items] : items));
        setHasMore(items.length === PAGE_SIZE);
      } catch {
        if (reqId !== lastReqId.current) return;
        if (mode === "replace") setUsers([]);
        setHasMore(false);
      } finally {
        if (reqId === lastReqId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [q, token]
  );

  useEffect(() => {
    if (!token) return;

    const t = setTimeout(() => {
      loadUsers("replace");
    }, q.trim() ? 250 : 0);

    return () => clearTimeout(t);
  }, [q, token, loadUsers]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadUsers("replace");
    }, [loadUsers, token])
  );

  const rows = useMemo(
    () => users.map((item) => toContactItem(item, selectedFields)),
    [selectedFields, users]
  );

  const headerCountText = (() => {
    if (loading && rows.length === 0) return "Đang tải...";
    return `${rows.length} mục`;
  })();

  const selectedFieldsText =
    selectedFields.length === 0
      ? "Không hiển thị dòng phụ"
      : selectedFields
          .map((field) => FIELD_OPTIONS.find((item) => item.key === field)?.label || field)
          .join(" • ");

  const toggleField = (field: SecondaryFieldKey) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((item) => item !== field)
        : [...prev, field]
    );
  };

  const Footer = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ color: "#6B7280" }}>Đang tải thêm...</Text>
        </View>
      );
    }

    if (!hasMore) return <View style={{ height: 24 }} />;

    return (
      <View style={{ paddingTop: 10, paddingBottom: 24, alignItems: "center" }}>
        <Pressable
          onPress={() => loadUsers("append", users.length)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: SKY,
            borderWidth: 1,
            borderColor: SKY_DARK,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Xem thêm</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Screen top={8} bottom={0}>
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search name / phone" />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
            {q.trim() ? "Kết quả" : "Danh sách người dùng"}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setFieldPickerOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#F3F4F6",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="options-outline" size={18} color="#111827" />
            </Pressable>

            {isAdmin ? (
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: SKY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={20} color="white" />
              </Pressable>
            ) : null}
          </View>
        </View>

        
      </View>

      <FlatList
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 120,
        }}
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContactRow item={item} onPress={() => router.push(`/contact/user/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />}
        ListFooterComponent={Footer}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {q.trim() ? "Không có user phù hợp." : "Chưa có user nào."}
              </Text>
            </View>
          ) : null
        }
      />

      <FieldPickerModal
        open={fieldPickerOpen}
        selectedFields={selectedFields}
        onToggle={toggleField}
        onClose={() => setFieldPickerOpen(false)}
      />

      {token ? (
        <CreateFriendModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          token={token}
          onCreated={() => {
            if (q.trim()) setQ("");
            else loadUsers("replace");
          }}
        />
      ) : null}
    </Screen>
  );
}
