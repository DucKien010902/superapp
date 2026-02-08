import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { fetchMe } from "@/lib/contact/api";
import type { UserPublic } from "@/lib/contact/types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";

export default function ProfileMeScreen() {
  const router = useRouter();
  const { token, signOut } = useAuth();

  const [me, setMe] = useState<UserPublic | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const u = await fetchMe(token);
      setMe(u);
    })();
  }, [token]);

  const cover = me?.profile?.coverUrl;
  const avatar = me?.profile?.avatarUrl;

  const onLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi tài khoản này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <Screen top={0} bottom={0}>
      <View style={{ backgroundColor: "white", flex: 1 }}>
        <View style={{ height: 180, backgroundColor: "#111827" }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
          ) : null}

          {/* ✅ nút Đăng xuất góc phải trên */}
          <View style={{ position: "absolute", right: 12, top: 12 }}>
            <Pressable
              onPress={onLogout}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.16)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.20)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
                Đăng xuất
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "#E5E7EB",
              borderWidth: 4,
              borderColor: "white",
            }}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%", borderRadius: 44 }} />
            ) : null}
          </View>

          <Text style={{ marginTop: 10, fontSize: 20, fontWeight: "900", color: "#111827" }}>
            {me?.profile?.displayName || "—"}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
            {me?.profile?.bio || "Chưa có tiểu sử"}
          </Text>

          <View style={{ marginTop: 14, gap: 8 }}>
            <InfoRow label="SĐT" value={me?.profile?.phone || "—"} />
            <InfoRow label="Công việc" value={me?.profile?.work || "—"} />
            <InfoRow label="Học vấn" value={me?.profile?.education || "—"} />
            <InfoRow
              label="Địa điểm"
              value={`${me?.profile?.location?.city || ""} ${me?.profile?.location?.country || ""}`.trim() || "—"}
            />
          </View>

          {/* ✅ nút Đăng xuất thêm ở dưới (tuỳ bạn giữ/ bỏ) */}
          <Pressable
            onPress={onLogout}
            style={{
              marginTop: 20,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: "#111827",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Đăng xuất</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13, color: "#6B7280" }}>{label}</Text>
      <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
