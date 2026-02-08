import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { acceptFriend, cancelOrUnfriend, fetchUserById, openDM, requestFriend } from "@/lib/contact/api";
import type { Relationship, UserPublic } from "@/lib/contact/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [rel, setRel] = useState<Relationship>({ status: "none", direction: "none" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!token || !id) return;
    const r = await fetchUserById(token, String(id));
    setUser(r.user);
    setRel(r.relationship);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const cta = useMemo(() => {
    // giống Facebook:
    // none -> Kết bạn
    // pending outgoing -> Hủy lời mời
    // pending incoming -> Chấp nhận
    // accepted -> Hủy bạn
    if (rel.status === "accepted") return { text: "Hủy bạn", kind: "unfriend" as const };
    if (rel.status === "pending" && rel.direction === "outgoing") return { text: "Hủy lời mời", kind: "cancel" as const };
    if (rel.status === "pending" && rel.direction === "incoming") return { text: "Chấp nhận", kind: "accept" as const };
    return { text: "Kết bạn", kind: "request" as const };
  }, [rel]);

  const onPrimary = async () => {
    if (!token || !id) return;
    setBusy(true);
    try {
      if (cta.kind === "request") await requestFriend(token, String(id));
      else if (cta.kind === "accept") await acceptFriend(token, String(id));
      else await cancelOrUnfriend(token, String(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onMessage = async () => {
  if (!token || !id || !user) return;
  setBusy(true);
  try {
    const r = await openDM(token, String(id));

    router.push({
      pathname: "/contact/chat/[conversationId]",
      params: {
        conversationId: r.conversationId,
        otherUserId: String(id),
        otherName: user?.profile?.displayName || "Người dùng",
        otherAvatar: user?.profile?.avatarUrl || "",
      },
    } as any);
  } finally {
    setBusy(false);
  }
};


  const cover = user?.profile?.coverUrl;
  const avatar = user?.profile?.avatarUrl;

  return (
    <Screen top={0} bottom={0}>
      <View style={{ backgroundColor: "white", flex: 1 }}>
        <View style={{ height: 180, backgroundColor: "#111827" }}>
          {cover ? <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} /> : null}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -40 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#E5E7EB", borderWidth: 4, borderColor: "white" }}>
            {avatar ? <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%", borderRadius: 44 }} /> : null}
          </View>

          <Text style={{ marginTop: 10, fontSize: 20, fontWeight: "900", color: "#111827" }}>
            {user?.profile?.displayName || "—"}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
            {user?.profile?.bio || "Chưa có tiểu sử"}
          </Text>

          {/* Buttons giống FB */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={onPrimary}
              disabled={busy}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: "#111827",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>{busy ? "..." : cta.text}</Text>
            </Pressable>

            <Pressable
              onPress={onMessage}
              disabled={busy}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "800" }}>Nhắn tin</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14, gap: 8 }}>
            <InfoRow label="SĐT" value={user?.profile?.phone || "—"} />
            <InfoRow label="Công việc" value={user?.profile?.work || "—"} />
            <InfoRow label="Học vấn" value={user?.profile?.education || "—"} />
            <InfoRow
              label="Địa điểm"
              value={`${user?.profile?.location?.city || ""} ${user?.profile?.location?.country || ""}`.trim() || "—"}
            />
          </View>
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
