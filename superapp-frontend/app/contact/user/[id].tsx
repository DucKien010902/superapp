import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import {
  acceptFriend,
  cancelOrUnfriend,
  fetchUserById,
  openDM,
  requestFriend,
} from "@/lib/contact/api";
import type { Relationship, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

function vOrDash(v?: string) {
  const s = (v ?? "").trim();
  return s ? s : "—";
}

function formatLocation(loc?: { city?: string; country?: string }) {
  const s = `${loc?.city || ""} ${loc?.country || ""}`.trim();
  return s ? s : "—";
}

type PreviewKind = "avatar" | "cover";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [rel, setRel] = useState<Relationship>({
    status: "none",
    direction: "none",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("cover");

  const load = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const r = await fetchUserById(token, String(id));
      setUser(r.user);
      setRel(r.relationship);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const cta = useMemo(() => {
    // none -> Kết bạn
    // pending outgoing -> Hủy lời mời
    // pending incoming -> Chấp nhận
    // accepted -> Hủy bạn
    if (rel.status === "accepted") return { text: "Hủy bạn", kind: "unfriend" as const, icon: "person-remove-outline" as const };
    if (rel.status === "pending" && rel.direction === "outgoing")
      return { text: "Hủy lời mời", kind: "cancel" as const, icon: "close-circle-outline" as const };
    if (rel.status === "pending" && rel.direction === "incoming")
      return { text: "Chấp nhận", kind: "accept" as const, icon: "checkmark-circle-outline" as const };
    return { text: "Kết bạn", kind: "request" as const, icon: "person-add-outline" as const };
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

  const cover = user?.profile?.coverUrl || "";
  const avatar = user?.profile?.avatarUrl || "";

  const openPreview = (kind: PreviewKind) => {
    const has = kind === "cover" ? cover : avatar;
    if (!has) return;
    setPreviewKind(kind);
    setPreviewOpen(true);
  };

  const previewUri = previewKind === "cover" ? cover : avatar;

  if (loading) {
    return (
      <Screen top={0} bottom={0}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Đang tải hồ sơ…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen top={0} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        {/* ===== TOP (FB-like) ===== */}
        <View style={{ backgroundColor: "white" }}>
          <View style={{ height: 210, backgroundColor: "#111827", position: "relative" }}>
            {/* Cover clickable */}
            <Pressable onPress={() => openPreview("cover")} style={{ flex: 1 }}>
              {cover ? (
                <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
                  <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontWeight: "800" }}>
                    Chưa có ảnh bìa
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Gradient overlay */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 70,
                backgroundColor: "rgba(0,0,0,0.25)",
              }}
            />

            {/* Avatar floating clickable */}
            <View style={{ position: "absolute", left: 16, bottom: -44, zIndex: 50, elevation: 50 }}>
              <Pressable onPress={() => openPreview("avatar")}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: "#E5E7EB",
                    borderWidth: 5,
                    borderColor: "white",
                    overflow: "hidden",
                  }}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="person-circle-outline" size={40} color="#6B7280" />
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          </View>

          {/* Name + bio */}
          <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
              {vOrDash(user?.profile?.displayName)}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
              {user?.profile?.bio?.trim() ? user.profile.bio : "Chưa có tiểu sử"}
            </Text>

            {/* Buttons (FB-like) */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={onPrimary}
                disabled={busy}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "#1877F2",
                  alignItems: "center",
                  opacity: busy ? 0.7 : 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name={cta.icon} size={18} color="white" />
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {busy ? "..." : cta.text}
                </Text>
              </Pressable>

              <Pressable
                onPress={onMessage}
                disabled={busy}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "#E5E7EB",
                  alignItems: "center",
                  opacity: busy ? 0.7 : 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#111827" />
                <Text style={{ color: "#111827", fontWeight: "900" }}>Nhắn tin</Text>
              </Pressable>
            </View>

            {/* Quick chips */}
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip icon="location-outline" text={formatLocation(user?.profile?.location)} />
              <Chip icon="school-outline" text={user?.profile?.education?.trim() ? user!.profile!.education! : "Chưa thêm học vấn"} />
              <Chip icon="briefcase-outline" text={user?.profile?.work?.trim() ? user!.profile!.work! : "Chưa thêm công việc"} />
            </View>
          </View>
        </View>

        {/* ===== Body ===== */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <SectionTitle icon="information-circle-outline" title="Thông tin công khai" />

            <Card>
              <InfoRow icon="at-outline" label="Username" value={vOrDash(user?.profile?.username)} />
              <Divider />
              <InfoRow icon="mail-outline" label="Email" value={vOrDash(user?.email)} />
              <Divider />
              <InfoRow icon="call-outline" label="SĐT" value={vOrDash(user?.profile?.phone)} />
              <Divider />
              <InfoRow icon="man-outline" label="Giới tính" value={vOrDash(user?.profile?.gender)} />
              <Divider />
              <InfoRow icon="calendar-outline" label="Ngày sinh" value={vOrDash(user?.profile?.birthday)} />
              <Divider />
              <InfoRow icon="briefcase-outline" label="Công việc" value={vOrDash(user?.profile?.work)} />
              <Divider />
              <InfoRow icon="school-outline" label="Học vấn" value={vOrDash(user?.profile?.education)} />
              <Divider />
              <InfoRow icon="navigate-outline" label="Địa điểm" value={formatLocation(user?.profile?.location)} />
            </Card>

            <View style={{ height: 12 }} />

            <SectionTitle icon="link-outline" title="Liên kết" />
            <Card>
              {user?.profile?.links && user.profile.links.length > 0 ? (
                user.profile.links.map((l, idx) => (
                  <View key={`${idx}-${l.label}-${l.url}`}>
                    <InfoRow
                      icon="globe-outline"
                      label={vOrDash(l.label)}
                      value={vOrDash(l.url)}
                    />
                    {idx !== ((user?.profile?.links?.length ?? 0) - 1) ? <Divider /> : null}

                  </View>
                ))
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>—</Text>
                </View>
              )}
            </Card>
          </View>
        </ScrollView>

        {/* ===== Preview modal ===== */}
        <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
            <View
              style={{
                paddingTop: 44,
                paddingHorizontal: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Pressable onPress={() => setPreviewOpen(false)} style={{ padding: 10 }}>
                <Ionicons name="close" size={26} color="white" />
              </Pressable>
              <Text style={{ color: "white", fontWeight: "900" }}>
                {previewKind === "cover" ? "Ảnh bìa" : "Ảnh đại diện"}
              </Text>
              <View style={{ width: 46 }} />
            </View>

            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 14 }}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: "100%", height: "100%", resizeMode: "contain", borderRadius: 12 }}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

/* ================== UI components ================== */

function Chip({ icon, text }: { icon: any; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Ionicons name={icon} size={14} color="#1D4ED8" />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>{text}</Text>
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

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: "#F9FAFB",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Ionicons name={icon} size={16} color="#111827" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "800" }}>{label}</Text>
        <Text style={{ marginTop: 2, fontSize: 13, color: "#111827", fontWeight: "900" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
