import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  acceptFriend,
  adminUpdateUser,
  cancelOrUnfriend,
  fetchUserById,
  openDM,
  requestFriend,
} from "@/lib/contact/api";
import type { Relationship, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type ProfileDraft = UserPublic["profile"];

function vOrDash(v?: string) {
  const s = (v ?? "").trim();
  return s ? s : "—";
}

function formatLocation(loc?: { city?: string; country?: string }) {
  const s = `${loc?.city || ""} ${loc?.country || ""}`.trim();
  return s ? s : "—";
}

function normalizeProfile(p?: ProfileDraft): ProfileDraft {
  return {
    username: p?.username || "",
    displayName: p?.displayName || "",
    avatarUrl: p?.avatarUrl || "",
    coverUrl: p?.coverUrl || "",

    bio: p?.bio || "",
    gender: p?.gender || "",
    birthday: p?.birthday || "",
    phone: p?.phone || "",

    location: {
      city: p?.location?.city || "",
      country: p?.location?.country || "",
    },

    work: p?.work || "",
    education: p?.education || "",

    links: p?.links || [],
  };
}

function toTel(phone?: string) {
  const s = (phone ?? "").trim();
  if (!s) return "";
  return s.replace(/[^\d+]/g, "");
}

async function callPhone(phone?: string) {
  const p = toTel(phone);
  if (!p) return;

  const url = `tel:${p}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Không thể gọi", "Thiết bị không hỗ trợ gọi điện.");
    return;
  }
  Linking.openURL(url);
}

type PreviewKind = "avatar" | "cover";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token, user: me } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [rel, setRel] = useState<Relationship>({
    status: "none",
    direction: "none",
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // admin edit mode
  const isAdmin = String(me?.role || "") === "admin";
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(normalizeProfile(undefined));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

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
      setDraft(normalizeProfile(r.user?.profile));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const cta = useMemo(() => {
    if (rel.status === "accepted")
      return {
        text: "Hủy bạn",
        kind: "unfriend" as const,
        icon: "person-remove-outline" as const,
      };
    if (rel.status === "pending" && rel.direction === "outgoing")
      return {
        text: "Hủy lời mời",
        kind: "cancel" as const,
        icon: "close-circle-outline" as const,
      };
    if (rel.status === "pending" && rel.direction === "incoming")
      return {
        text: "Chấp nhận",
        kind: "accept" as const,
        icon: "checkmark-circle-outline" as const,
      };
    return {
      text: "Kết bạn",
      kind: "request" as const,
      icon: "person-add-outline" as const,
    };
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

  const onStartEdit = () => {
    if (!isAdmin) return;
    setDraft(normalizeProfile(user?.profile));
    setEdit(true);
  };

  const onCancelEdit = () => {
    Alert.alert("Hủy thay đổi", "Bỏ tất cả thay đổi và quay lại?", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy thay đổi",
        style: "destructive",
        onPress: () => {
          setDraft(normalizeProfile(user?.profile));
          setEdit(false);
        },
      },
    ]);
  };

  const onSave = async () => {
    if (!token || !id) return;
    if (!draft.displayName.trim()) {
      Alert.alert("Thiếu thông tin", "Display name không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adminUpdateUser(token, String(id), { profile: draft });
      setUser(updated);
      setDraft(normalizeProfile(updated.profile));
      setEdit(false);
      Alert.alert("Thành công", "Đã lưu hồ sơ người dùng.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  async function ensurePermissions() {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) throw new Error("Bạn cần cấp quyền truy cập thư viện ảnh.");
    await ImagePicker.requestCameraPermissionsAsync();
  }

  const pickImage = async (mode: "camera" | "library"): Promise<string | null> => {
    await ensurePermissions();

    const base: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    };

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync(base)
        : await ImagePicker.launchImageLibraryAsync(base);

    if (result.canceled) return null;
    return result.assets?.[0]?.uri || null;
  };

  const doUpload = async (kind: "avatar" | "cover", mode: "camera" | "library") => {
    if (!edit) {
      Alert.alert("Chỉnh sửa", "Bạn cần bấm 'Sửa' trước khi đổi ảnh.");
      return;
    }

    try {
      const uri = await pickImage(mode);
      if (!uri) return;

      Alert.alert("Xác nhận", "Upload ảnh này lên Cloudinary?", [
        { text: "Không", style: "cancel" },
        {
          text: "Upload",
          onPress: async () => {
            try {
              setUploading(kind);
              const url = await uploadImageToCloudinary(uri);
              setDraft((p) => ({
                ...p,
                [kind === "avatar" ? "avatarUrl" : "coverUrl"]: url,
              }));
            } catch (e: any) {
              Alert.alert("Lỗi upload", e?.message || "Upload thất bại");
            } finally {
              setUploading(null);
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thao tác được ảnh");
    }
  };

  const cover = (edit ? draft.coverUrl : user?.profile?.coverUrl) || "";
  const avatar = (edit ? draft.avatarUrl : user?.profile?.avatarUrl) || "";

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

  const phoneRaw = (user?.profile?.phone ?? "").trim();
  const hasPhone = !!toTel(phoneRaw);

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

            {/* ✅ Admin top actions (Sửa/Lưu/Hủy) */}
            {isAdmin ? (
              <View
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  flexDirection: "row",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                {!edit ? (
                  <IconBtn icon="create-outline" label="Sửa" onPress={onStartEdit} />
                ) : (
                  <>
                    <IconBtn
                      icon="checkmark-outline"
                      label={saving ? "Lưu…" : "Lưu"}
                      onPress={onSave}
                      disabled={saving || !!uploading}
                    />
                    <IconBtn
                      icon="close-outline"
                      label="Hủy"
                      danger
                      onPress={onCancelEdit}
                      disabled={saving || !!uploading}
                    />
                  </>
                )}
              </View>
            ) : null}

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

                {/* small camera badge chỉ để vibe (admin edit thì dùng upload menu) */}
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#E5E7EB",
                    borderWidth: 3,
                    borderColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="camera" size={16} color="#111827" />
                </View>
              </Pressable>
            </View>

            {/* ✅ Admin upload button */}
            {isAdmin && edit ? (
              <View style={{ position: "absolute", right: 14, bottom: -18 }}>
                <Pressable
                  onPress={() => setUploadMenuOpen(true)}
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "#1877F2",
                    shadowColor: "#000",
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="white" />
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>Tải ảnh</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Name + bio */}
          <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
              {edit ? draft.displayName : vOrDash(user?.profile?.displayName)}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
              {edit ? (draft.bio?.trim() ? draft.bio : "—") : user?.profile?.bio?.trim() ? user!.profile!.bio! : "Chưa có tiểu sử"}
            </Text>

            {/* ✅ Nếu không phải admin edit thì vẫn giữ 2 nút Kết bạn/Nhắn tin */}
            {!isAdmin ? (
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
                  <Text style={{ color: "white", fontWeight: "900" }}>{busy ? "..." : cta.text}</Text>
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
            ) : null}

            {/* Quick chips */}
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip icon="location-outline" text={formatLocation(edit ? draft.location : user?.profile?.location)} />
              <Chip icon="school-outline" text={(edit ? draft.education : user?.profile?.education)?.trim() ? (edit ? draft.education : user!.profile!.education!) : "Chưa thêm học vấn"} />
              <Chip icon="briefcase-outline" text={(edit ? draft.work : user?.profile?.work)?.trim() ? (edit ? draft.work : user!.profile!.work!) : "Chưa thêm công việc"} />
            </View>
          </View>
        </View>

        {/* ===== Body ===== */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            {!edit ? (
              <>
                <SectionTitle icon="information-circle-outline" title="Thông tin công khai" />

                <Card>
                  <InfoRow icon="at-outline" label="Username" value={vOrDash(user?.profile?.username)} />
                  <Divider />
                  <InfoRow icon="mail-outline" label="Email" value={vOrDash(user?.email)} />
                  <Divider />

                  <InfoRow
                    icon="call-outline"
                    label="SĐT"
                    value={vOrDash(user?.profile?.phone)}
                    valueColor={hasPhone ? "#2563EB" : "#111827"}
                    valueUnderline={hasPhone}
                    onPressValue={hasPhone ? () => callPhone(user?.profile?.phone) : undefined}
                  />

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
                        <InfoRow icon="globe-outline" label={vOrDash(l.label)} value={vOrDash(l.url)} />
                        {idx !== (user?.profile?.links?.length ?? 0) - 1 ? <Divider /> : null}
                      </View>
                    ))
                  ) : (
                    <View style={{ padding: 12 }}>
                      <Text style={{ fontSize: 13, color: "#6B7280" }}>—</Text>
                    </View>
                  )}
                </Card>
              </>
            ) : (
              <>
                <SectionTitle icon="create-outline" title="Chỉnh sửa hồ sơ" />

                <Card>
                  <Field
                    label="Display name *"
                    value={draft.displayName}
                    onChange={(t) => setDraft((p) => ({ ...p, displayName: t }))}
                  />
                  <Divider />
                  <Field
                    label="Username"
                    value={draft.username || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, username: t }))}
                  />
                  <Divider />
                  <Field
                    label="Bio"
                    value={draft.bio || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, bio: t }))}
                    multiline
                  />
                </Card>

                <View style={{ height: 12 }} />

                <Card>
                  <Field
                    label="SĐT"
                    value={draft.phone || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, phone: t }))}
                    keyboardType="phone-pad"
                  />
                  <Divider />
                  <Field
                    label="Giới tính (male/female/other)"
                    value={draft.gender || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, gender: t }))}
                  />
                  <Divider />
                  <Field
                    label="Ngày sinh (yyyy-mm-dd)"
                    value={draft.birthday || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, birthday: t }))}
                  />
                </Card>

                <View style={{ height: 12 }} />

                <Card>
                  <Field
                    label="Công việc"
                    value={draft.work || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, work: t }))}
                  />
                  <Divider />
                  <Field
                    label="Học vấn"
                    value={draft.education || ""}
                    onChange={(t) => setDraft((p) => ({ ...p, education: t }))}
                  />
                  <Divider />
                  <Field
                    label="Thành phố"
                    value={draft.location?.city || ""}
                    onChange={(t) =>
                      setDraft((p) => ({ ...p, location: { ...(p.location || {}), city: t } }))
                    }
                  />
                  <Divider />
                  <Field
                    label="Quốc gia"
                    value={draft.location?.country || ""}
                    onChange={(t) =>
                      setDraft((p) => ({ ...p, location: { ...(p.location || {}), country: t } }))
                    }
                  />
                </Card>
              </>
            )}
          </View>
        </ScrollView>

        {/* ===== Upload menu (admin edit) ===== */}
        <Modal
          visible={uploadMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setUploadMenuOpen(false)}
        >
          <Pressable
            onPress={() => setUploadMenuOpen(false)}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: 16,
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <View style={{ width: 44, height: 5, borderRadius: 99, backgroundColor: "#E5E7EB" }} />
              </View>

              <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>Tải ảnh lên</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                Chọn loại ảnh bạn muốn sửa (Avatar / Ảnh bìa)
              </Text>

              <View style={{ height: 12 }} />

              <ActionRow
                icon="person-circle-outline"
                title="Đổi ảnh đại diện"
                subtitle={uploading === "avatar" ? "Đang upload…" : "Chọn ảnh và upload"}
                onPress={() => {
                  setUploadMenuOpen(false);
                  Alert.alert("Ảnh đại diện", "Chọn nguồn ảnh", [
                    { text: "Hủy", style: "cancel" },
                    { text: "Chụp ảnh", onPress: () => doUpload("avatar", "camera") },
                    { text: "Thư viện", onPress: () => doUpload("avatar", "library") },
                  ]);
                }}
              />

              <ActionRow
                icon="image-outline"
                title="Đổi ảnh bìa"
                subtitle={uploading === "cover" ? "Đang upload…" : "Chọn ảnh và upload"}
                onPress={() => {
                  setUploadMenuOpen(false);
                  Alert.alert("Ảnh bìa", "Chọn nguồn ảnh", [
                    { text: "Hủy", style: "cancel" },
                    { text: "Chụp ảnh", onPress: () => doUpload("cover", "camera") },
                    { text: "Thư viện", onPress: () => doUpload("cover", "library") },
                  ]);
                }}
              />

              <View style={{ height: 10 }} />
            </Pressable>
          </Pressable>
        </Modal>

        {/* ===== Preview modal ===== */}
        <Modal
          visible={previewOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewOpen(false)}
        >
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

function IconBtn({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const bg = danger ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.18)";
  const bd = danger ? "rgba(239,68,68,0.28)" : "rgba(255,255,255,0.25)";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: bd,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Ionicons name={icon} size={16} color="white" />
      <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({ icon, text }: { icon: any; text?: string }) {
  const safe = (text ?? "").trim() || "—";
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
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>
        {safe}
      </Text>
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
      <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>
        {title}
      </Text>
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

/** InfoRow hỗ trợ value bấm được (SĐT), đổi màu, underline */
function InfoRow({
  icon,
  label,
  value,
  onPressValue,
  valueColor,
  valueUnderline,
}: {
  icon: any;
  label: string;
  value: string;
  onPressValue?: () => void;
  valueColor?: string;
  valueUnderline?: boolean;
}) {
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
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "800" }}>
          {label}
        </Text>

        {onPressValue ? (
          <Pressable onPress={onPressValue} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text
              style={{
                marginTop: 2,
                fontSize: 13,
                fontWeight: "900",
                color: valueColor ?? "#2563EB",
                textDecorationLine: valueUnderline ? "underline" : "none",
              }}
            >
              {value}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={{
              marginTop: 2,
              fontSize: 13,
              color: valueColor ?? "#111827",
              fontWeight: "900",
              textDecorationLine: valueUnderline ? "underline" : "none",
            }}
          >
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "900", marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="—"
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 12 : 10,
          minHeight: multiline ? 96 : undefined,
          backgroundColor: "#F9FAFB",
          color: "#111827",
          fontSize: 13,
        }}
      />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: "#DBEAFE",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color="#1D4ED8" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "900", color: "#111827" }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
          {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </Pressable>
  );
}