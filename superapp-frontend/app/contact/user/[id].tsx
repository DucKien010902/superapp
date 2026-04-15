import Screen from "@/components/Screen";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import { useAuth } from "@/lib/auth";
import {
  acceptFriend,
  adminDeleteUser,
  adminUpdateUser,
  cancelOrUnfriend,
  deleteMedia,
  fetchUserById,
  openDM,
  requestFriend,
  uploadMedia,
} from "@/lib/contact/api";
import type { Relationship, UserEvaluation, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type ProfileDraft = UserPublic["profile"];
const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const SKY_SOFT = "#E0F2FE";
const SKY_BORDER = "#7DD3FC";

const DEFAULT_COVER_URL =
  "https://d28jzcg6y4v9j1.cloudfront.net/2025/05/04/hinh_nen_may_tinh_4k_bien_13_1746343476852.jpg";

function vOrDash(v?: string) {
  const s = (v ?? "").trim();
  return s ? s : "—";
}

function formatLocation(loc?: { city?: string; country?: string }) {
  const s = `${loc?.city || ""} ${loc?.country || ""}`.trim();
  return s ? s : "Chưa thêm địa điểm";
}

function normalizeProfile(p?: ProfileDraft): ProfileDraft {
  return {
    username: p?.username || "",
    displayName: p?.displayName || "",
    avatarUrl: p?.avatarUrl || "",
    coverUrl: p?.coverUrl || DEFAULT_COVER_URL,
    bio: p?.bio || "",
    note: p?.note || "",
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

function normalizeEvaluation(e?: UserEvaluation): UserEvaluation {
  return {
    score: e?.score || "",
    attitude: e?.attitude || "",
    skill: e?.skill || "",
    general: e?.general || [],
    detailed: e?.detailed || [],
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

function normalizeUrl(url?: string) {
  const raw = (url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

async function openExternalLink(url?: string) {
  const finalUrl = normalizeUrl(url);
  if (!finalUrl) return;
  const ok = await Linking.canOpenURL(finalUrl);
  if (!ok) {
    Alert.alert("Liên kết không hợp lệ", "Không thể mở liên kết này.");
    return;
  }
  Linking.openURL(finalUrl);
}

function imageAssetName(uri: string, index = 0) {
  return uri.split("/").pop() || `image_${Date.now()}_${index}.jpg`;
}

function imageMimeType(name: string) {
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

type PreviewKind = "avatar" | "cover";
type ContentTab = "all" | "images" | "files";
type MediaPreview = {
  kind: "image" | "file";
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
};

function formatBytes(size?: number) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

function fileIcon(name?: string, mime?: string) {
  const n = String(name || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|heic)$/.test(n)) return "image-outline";
  if (m.includes("pdf") || n.endsWith(".pdf")) return "document-text-outline";
  if (/\.(doc|docx)$/.test(n)) return "document-outline";
  if (/\.(xls|xlsx|csv)$/.test(n)) return "grid-outline";
  if (/\.(zip|rar|7z)$/.test(n)) return "folder-open-outline";
  return "document-text-outline";
}

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

  // admin mode
  const isAdmin = String(me?.role || "") === "admin";
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saveNoticeTitle, setSaveNoticeTitle] = useState("Lưu thành công");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeProgress, setSaveNoticeProgress] = useState(1);

  // Profile Edit Modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(normalizeProfile(undefined));

  // Evaluation Edit Modal
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalDraft, setEvalDraft] = useState<UserEvaluation>(normalizeEvaluation(undefined));
  const [contentTab, setContentTab] = useState<ContentTab>("all");

  // preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("cover");
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);

  const load = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const r = await fetchUserById(token, String(id));
      setUser(r.user);
      setRel(r.relationship);
      setProfileDraft(normalizeProfile(r.user?.profile));
      setEvalDraft(normalizeEvaluation(r.user?.evaluation));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  useEffect(() => {
    if (!saveNotice) return;
    const duration = 1000;
    const startedAt = Date.now();
    setSaveNoticeProgress(1);

    const timer = setTimeout(() => {
      setSaveNotice(null);
      setSaveNoticeProgress(1);
    }, duration);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.max(0, 1 - elapsed / duration);
      setSaveNoticeProgress(next);
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [saveNotice]);

  const cta = useMemo(() => {
    if (rel.status === "accepted") return { text: "Hủy bạn", kind: "unfriend" as const, icon: "person-remove-outline" as const };
    if (rel.status === "pending" && rel.direction === "outgoing") return { text: "Hủy lời mời", kind: "cancel" as const, icon: "close-circle-outline" as const };
    if (rel.status === "pending" && rel.direction === "incoming") return { text: "Chấp nhận", kind: "accept" as const, icon: "checkmark-circle-outline" as const };
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

  // --- ACTIONS PROFILE ---
  const onStartEditProfile = () => {
    if (!isAdmin) return;
    setSaveNotice(null);
    setProfileDraft(normalizeProfile(user?.profile));
    setEditProfileOpen(true);
  };

  const onSaveProfile = async () => {
    if (!token || !id) return;
    if (!profileDraft.displayName.trim()) {
      Alert.alert("Thiếu thông tin", "Display name không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adminUpdateUser(token, String(id), { profile: profileDraft });
      setUser(updated);
      setProfileDraft(normalizeProfile(updated.profile));
      setEditProfileOpen(false);
      setSaveNoticeTitle("Lưu thành công");
      setSaveNotice("Đã lưu hồ sơ thành công.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // --- ACTIONS EVALUATION ---
  const onStartEval = () => {
    setSaveNotice(null);
    setEvalDraft(normalizeEvaluation(user?.evaluation));
    setEvalOpen(true);
  };

  const onSaveEval = async () => {
    if (!token || !id) return;
    setSaving(true);
    try {
      const updated = await adminUpdateUser(token, String(id), { evaluation: evalDraft });
      setUser(updated);
      setEvalDraft(normalizeEvaluation(updated.evaluation));
      setEvalOpen(false);
      setSaveNoticeTitle("Lưu thành công");
      setSaveNotice("Đã lưu đánh giá thành công.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Lưu đánh giá thất bại");
    } finally {
      setSaving(false);
    }
  };

  // --- ACTIONS XÓA USER CÓ CẢNH BÁO ---
  const onDeleteUser = () => {
    Alert.alert(
      "Cảnh báo nguy hiểm",
      "Bạn có chắc chắn muốn xóa vĩnh viễn người dùng này?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa vĩnh viễn", 
          style: "destructive", 
          onPress: async () => {
            try {
              if(!token || !id) return;
              setBusy(true); // Tận dụng state busy để disable màn hình nếu cần
              await adminDeleteUser(token, String(id));
              setSaveNoticeTitle("Xóa thành công");
              setSaveNotice("Đã xóa người dùng.");
              setTimeout(() => {
                router.replace("/contact/contacts" as any);
              }, 900);
            } catch (e: any) {
              Alert.alert("Lỗi", e?.message || "Không thể xóa người dùng");
            } finally {
              setBusy(false);
            }
          } 
        }
      ]
    );
  }

  // --- UPLOAD ẢNH ---
  const pickImage = async (mode: "camera" | "library"): Promise<string | null> => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) throw new Error("Bạn cần cấp quyền truy cập thư viện ảnh.");
    await ImagePicker.requestCameraPermissionsAsync();

    const result = mode === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] });

    if (result.canceled) return null;
    return result.assets?.[0]?.uri || null;
  };

  const doUpload = async (kind: "avatar" | "cover", mode: "camera" | "library") => {
    if (!token || !id || !isAdmin) return;
    try {
      const uri = await pickImage(mode);
      if (!uri) return;
      Alert.alert("Xác nhận", "Upload ảnh này?", [
        { text: "Không", style: "cancel" },
        {
          text: "Upload", onPress: async () => {
            try {
              setUploading(kind);
              const name = imageAssetName(uri);
              const r = await uploadMedia(token, {
                scope: "user",
                ownerId: String(id),
                kind,
                files: [{ uri, name, type: imageMimeType(name) }],
              });
              if (r.user) {
                setUser(r.user);
                const updatedProfile = normalizeProfile(r.user.profile);
                setProfileDraft((p) => ({
                  ...p,
                  avatarUrl: updatedProfile.avatarUrl,
                  coverUrl: updatedProfile.coverUrl,
                }));
              }
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

  const uploadUserImages = async () => {
    if (!token || !id || !isAdmin) return;
    try {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) throw new Error("Bạn cần cấp quyền truy cập thư viện ảnh.");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsMultipleSelection: true,
      });
      if (result.canceled) return;

      setUploadingMedia(true);
      const files = (result.assets || []).map((asset, idx) => {
        const name = asset.fileName || imageAssetName(asset.uri, idx);
        return { uri: asset.uri, name, type: asset.mimeType || imageMimeType(name) };
      });
      const r = await uploadMedia(token, { scope: "user", ownerId: String(id), kind: "image", files });
      if (r.user) setUser(r.user);
    } catch (e: any) {
      Alert.alert("Lỗi upload", e?.message || "Không upload được ảnh");
    } finally {
      setUploadingMedia(false);
    }
  };

  const uploadUserFiles = async () => {
    if (!token || !id || !isAdmin) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      setUploadingMedia(true);
      const files = (result.assets || []).map((asset) => ({
        uri: asset.uri,
        name: asset.name || `file_${Date.now()}`,
        type: asset.mimeType || "application/octet-stream",
      }));
      const r = await uploadMedia(token, { scope: "user", ownerId: String(id), kind: "file", files });
      if (r.user) setUser(r.user);
    } catch (e: any) {
      Alert.alert("Lỗi upload", e?.message || "Không upload được file");
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteUserMedia = (kind: "image" | "file", mediaId?: string) => {
    if (!token || !id || !mediaId || !isAdmin) return;
    Alert.alert("Xóa mục này", "Bạn muốn xóa mục này khỏi hồ sơ và MinIO?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await deleteMedia(token, {
              scope: "user",
              ownerId: String(id),
              kind,
              mediaId,
            });
            if (r.user) setUser(r.user);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không xóa được mục này");
          }
        },
      },
    ]);
  };

  const openPreview = (kind: PreviewKind) => {
    const has =
      kind === "cover"
        ? user?.profile?.coverUrl || profileDraft?.coverUrl || DEFAULT_COVER_URL
        : user?.profile?.avatarUrl || profileDraft?.avatarUrl;
    if (!has) return;
    setPreviewKind(kind);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <Screen top={0} bottom={0}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Đang tải hồ sơ...</Text>
        </View>
      </Screen>
    );
  }

  const phoneRaw = (user?.profile?.phone ?? "").trim();
  const hasPhone = !!toTel(phoneRaw);
  const cover = user?.profile?.coverUrl || DEFAULT_COVER_URL;
  const avatar = user?.profile?.avatarUrl || "";
  const galleryImages = [
    ...(avatar ? [{ url: avatar, locked: true }] : []),
    ...(cover ? [{ url: cover, locked: true }] : []),
    ...((user?.images || [])
      .filter((x) => !!x.url)
      .map((x) => ({ url: x.url, id: x.id, locked: false })) as {
      url: string;
      id?: string;
      locked: boolean;
    }[]),
  ].slice(0, 30);
  const profileFiles = user?.files || [];

  return (
    <Screen top={0} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "#ECF1F7" }}>
        
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ======================================================= */}
          {/* MÀN HÌNH CHÍNH */}
          {/* ======================================================= */}
          <View style={{ backgroundColor: "white" }}>
            <View style={{ height: 232, backgroundColor: "#1F2937", position: "relative" }}>
              <Pressable onPress={() => openPreview("cover")} style={{ flex: 1 }}>
                {cover ? (
                  <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="image-outline" size={28} color="rgba(255,255,255,0.7)" />
                  </View>
                )}
              </Pressable>

              <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, backgroundColor: "rgba(0,0,0,0.25)" }} />

              {isAdmin && !editProfileOpen && (
                <View style={{ position: "absolute", right: 12, top: 12 }}>
                  <IconBtn icon="create-outline" label="Sửa hồ sơ" onPress={onStartEditProfile} />
                </View>
              )}

              <View style={{ position: "absolute", left: 16, bottom: -56, zIndex: 50, elevation: 50 }}>
                <Pressable onPress={() => openPreview("avatar")}>
                  <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: "#E5E7EB", borderWidth: 5, borderColor: "white", overflow: "hidden" }}>
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

            <View style={{ paddingHorizontal: 16, paddingTop: 66, paddingBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
                {vOrDash(user?.profile?.displayName)}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
                {user?.profile?.bio?.trim() ? user!.profile!.bio! : "Chưa có tiểu sử"}
              </Text>

              {!isAdmin && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <Pressable onPress={onPrimary} disabled={busy} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: SKY, borderWidth: 1, borderColor: SKY_DARK, alignItems: "center", opacity: busy ? 0.7 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <Ionicons name={cta.icon} size={18} color="white" />
                    <Text style={{ color: "white", fontWeight: "900" }}>{busy ? "..." : cta.text}</Text>
                  </Pressable>

                  <Pressable onPress={onMessage} disabled={busy} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "#E5E7EB", alignItems: "center", opacity: busy ? 0.7 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#111827" />
                    <Text style={{ color: "#111827", fontWeight: "900" }}>Nhắn tin</Text>
                  </Pressable>
                </View>
              )}

              <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip icon="location-outline" text={formatLocation(user?.profile?.location)} />
                <Chip icon="school-outline" text={user?.profile?.education?.trim() ? user!.profile!.education! : "Chưa thêm học vấn"} />
                <Chip icon="briefcase-outline" text={user?.profile?.work?.trim() ? user!.profile!.work! : "Chưa thêm công việc"} />
              </View>

              <View style={{ marginTop: 16, flexDirection: "row", gap: 6 }}>
                <ProfileTabPill
                  label="Tất cả"
                  icon="apps-outline"
                  active={contentTab === "all"}
                  onPress={() => setContentTab("all")}
                />
                <ProfileTabPill
                  label="Đánh giá"
                  icon="star-outline"
                  active={evalOpen}
                  onPress={onStartEval}
                />
                <ProfileTabPill
                  label="Ảnh"
                  icon="images-outline"
                  active={contentTab === "images"}
                  onPress={() => setContentTab("images")}
                />
                <ProfileTabPill
                  label="File"
                  icon="document-text-outline"
                  active={contentTab === "files"}
                  onPress={() => setContentTab("files")}
                />
              </View>
            </View>
          </View>

          {contentTab === "all" ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <SectionTitle icon="information-circle-outline" title="Thông tin công khai" />
              <Card>
                <InfoRow icon="at-outline" label="Username" value={vOrDash(user?.profile?.username)} />
                <Divider />
                <InfoRow icon="mail-outline" label="Email" value={vOrDash(user?.email)} />
                <Divider />
                <InfoRow icon="call-outline" label="SĐT" value={vOrDash(user?.profile?.phone)} valueColor={hasPhone ? SKY_DARK : "#111827"} valueUnderline={hasPhone} onPressValue={hasPhone ? () => callPhone(user?.profile?.phone) : undefined} />
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
                <Divider />
                <InfoRow icon="document-text-outline" label="Ghi chú" value={vOrDash(user?.profile?.note)} />
              </Card>

              <View style={{ height: 12 }} />

              <SectionTitle icon="link-outline" title="Liên kết" />
              <Card>
                {user?.profile?.links && user.profile.links.length > 0 ? (
                  user.profile.links.map((l, idx) => (
                    <View key={`${idx}-${l.label}-${l.url}`}>
                      <InfoRow icon="globe-outline" label={vOrDash(l.label)} value={vOrDash(l.url)} valueColor="#0C4A6E" valueUnderline onPressValue={() => openExternalLink(l.url)} />
                      {idx !== (user?.profile?.links?.length ?? 0) - 1 ? <Divider /> : null}
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 12 }}><Text style={{ fontSize: 13, color: "#6B7280" }}>—</Text></View>
                )}
              </Card>

              {isAdmin && (
                <View style={{ marginTop: 40, alignItems: 'center' }}>
                  <Pressable onPress={onDeleteUser} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Xóa người dùng này</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : null}

          {contentTab === "images" ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <SectionTitle icon="images-outline" title="Ảnh" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Pressable
                  onPress={uploadUserImages}
                  disabled={!isAdmin || uploadingMedia}
                  style={{
                    width: "31%",
                    aspectRatio: 1,
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderStyle: "dashed",
                    borderColor: "#93C5FD",
                    backgroundColor: "#EFF6FF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={uploadingMedia ? "cloud-upload-outline" : "add"} size={28} color={SKY_DARK} />
                  <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "800", color: SKY_DARK }}>
                    {uploadingMedia ? "Đang tải" : "Thêm"}
                  </Text>
                </Pressable>

                {galleryImages.map((item, idx) => (
                  <Pressable
                    key={`${item.url}-${idx}`}
                    onPress={() => setMediaPreview({ kind: "image", url: item.url, name: "Ảnh" })}
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      borderRadius: 18,
                      overflow: "hidden",
                      backgroundColor: "#E5E7EB",
                    }}
                  >
                    <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} />
                    {isAdmin && !item.locked && item.id ? (
                      <Pressable
                        onPress={() => deleteUserMedia("image", item.id)}
                        style={{
                          position: "absolute",
                          right: 6,
                          top: 6,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: "rgba(17,24,39,0.72)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color="white" />
                      </Pressable>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {contentTab === "files" ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <SectionTitle icon="document-text-outline" title="File" />
              <Card>
                <Pressable
                  onPress={uploadUserFiles}
                  disabled={!isAdmin || uploadingMedia}
                  style={{
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#F8FBFF",
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={uploadingMedia ? "cloud-upload-outline" : "add"} size={22} color={SKY_DARK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>
                      {uploadingMedia ? "Đang upload..." : "Thêm file"}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>Chọn một hoặc nhiều file để lưu vào MinIO</Text>
                  </View>
                </Pressable>
                <Divider />
                {profileFiles.length === 0 ? (
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có file nào.</Text>
                  </View>
                ) : (
                  profileFiles.map((file, idx) => (
                    <View key={file.id || `${file.url}-${idx}`}>
                      <FileRow
                        icon={fileIcon(file.name, file.mimeType)}
                        name={file.name || "Untitled"}
                        meta={`${formatBytes(file.size)} • ${formatDate(file.createdAt)}`}
                        onPress={() =>
                          setMediaPreview({
                            kind: String(file.mimeType || "").startsWith("image/") ? "image" : "file",
                            url: file.url,
                            name: file.name || "Untitled",
                            mimeType: file.mimeType,
                            size: file.size,
                            createdAt: file.createdAt,
                          })
                        }
                        onDelete={isAdmin && file.id ? () => deleteUserMedia("file", file.id) : undefined}
                      />
                      {idx !== profileFiles.length - 1 ? <Divider /> : null}
                    </View>
                  ))
                )}
              </Card>
            </View>
          ) : null}
        </ScrollView>

        {saveNotice ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 320,
                minHeight:100,
                backgroundColor: "#F0FDF4",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "#86EFAC",
                overflow: "hidden",
                shadowColor: "#14532D",
                shadowOpacity: 0.14,
                shadowRadius: 18,
                elevation: 8,
              }}
            >
              <View style={{ height: 5, backgroundColor: "#DCFCE7" }}>
                <View
                  style={{
                    width: `${saveNoticeProgress * 100}%`,
                    height: "100%",
                    backgroundColor: "#22C55E",
                  }}
                />
              </View>

              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#DCFCE7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="checkmark-done-outline" size={24} color="#15803D" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#14532D" }}>
                    {saveNoticeTitle}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 13, color: "#166534", lineHeight: 19 }}>
                    {saveNotice}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setSaveNotice(null);
                    setSaveNoticeProgress(1);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#DCFCE7",
                  }}
                >
                  <Ionicons name="close" size={16} color="#166534" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* ======================================================= */}
        {/* MODAL SỬA PROFILE (Đã khôi phục đủ trường) */}
        {/* ======================================================= */}
        <KeyboardSafeModalFrame visible={editProfileOpen} onRequestClose={() => setEditProfileOpen(false)} padding={10}>
              <View style={{ width: "100%", height: "90%", backgroundColor: "#F8FAFC", borderRadius: 28, overflow: "hidden" }}>
                <View style={{ alignItems: "center", paddingTop: 10 }}>
                  <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
                </View>

                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#FFF" }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>Chỉnh sửa hồ sơ</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>Cập nhật thông tin và bấm Lưu để áp dụng thay đổi.</Text>

                  <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                    <OutlineButton icon="close-outline" label="Đóng" onPress={() => setEditProfileOpen(false)} disabled={saving || !!uploading} style={{ flex: 1 }} />
                    <OutlineButton
                      icon="cloud-upload-outline"
                      label={uploading ? "Đang tải" : "Tải ảnh"}
                      onPress={() =>
                        Alert.alert("Ảnh hồ sơ", "Chọn loại ảnh muốn đổi", [
                          { text: "Hủy", style: "cancel" },
                          { text: "Đổi ảnh đại diện", onPress: () => doUpload("avatar", "library") },
                          { text: "Đổi ảnh bìa", onPress: () => doUpload("cover", "library") },
                        ])
                      }
                      disabled={saving || !!uploading}
                      style={{ flex: 1 }}
                    />
                    <SolidButton icon="checkmark-outline" label={saving ? "Đang lưu" : "Lưu"} onPress={onSaveProfile} disabled={saving || !!uploading} style={{ flex: 1 }} />
                  </View>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                >
                  <SectionTitle icon="document-text-outline" title="Thông tin cơ bản" />
                  <Card>
                    <Field label="Tên hiển thị *" value={profileDraft.displayName} onChange={(t:any) => setProfileDraft((p) => ({ ...p, displayName: t }))} />
                    <Divider />
                    <Field label="Username" value={profileDraft.username || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, username: t }))} />
                    <Divider />
                    <Field label="Tiểu sử" value={profileDraft.bio || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, bio: t }))} multiline />
                    <Divider />
                    <Field label="Ghi chú" value={profileDraft.note || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, note: t }))} multiline />
                  </Card>

                  <View style={{ height: 12 }} />
                  <Card>
                    <Field label="SĐT" value={profileDraft.phone || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />
                    <Divider />
                    <Field label="Giới tính" value={profileDraft.gender || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, gender: t }))} />
                    <Divider />
                    <Field label="Ngày sinh (yyyy-mm-dd)" value={profileDraft.birthday || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, birthday: t }))} />
                  </Card>

                  <View style={{ height: 12 }} />
                  <Card>
                    <Field label="Công việc" value={profileDraft.work || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, work: t }))} />
                    <Divider />
                    <Field label="Học vấn" value={profileDraft.education || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, education: t }))} />
                    <Divider />
                    <Field label="Thành phố" value={profileDraft.location?.city || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, location: { ...(p.location || {}), city: t } }))} />
                    <Divider />
                    <Field label="Quốc gia" value={profileDraft.location?.country || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, location: { ...(p.location || {}), country: t } }))} />
                  </Card>

                  <View style={{ height: 12 }} />
                  <SectionTitle icon="link-outline" title="Liên kết" />
                  <Card>
                    <Field
                      label="Liên kết 1 (URL)"
                      value={profileDraft.links?.[0]?.url || ""}
                      onChange={(t:any) => setProfileDraft((p:any) => ({ ...p, links: [{ label: p?.links?.[0]?.label || "Liên kết 1", url: t }, ...(p?.links?.slice(1) || [])] }))}
                      keyboardType="url"
                    />
                    <Divider />
                    <Field
                      label="Liên kết 2 (URL)"
                      value={profileDraft.links?.[1]?.url || ""}
                      onChange={(t:any) => setProfileDraft((p:any) => ({ ...p, links: [p?.links?.[0] || { label: "Liên kết 1", url: "" }, { label: p?.links?.[1]?.label || "Liên kết 2", url: t }, ...(p?.links?.slice(2) || [])] }))}
                      keyboardType="url"
                    />
                  </Card>
                </ScrollView>
              </View>
        </KeyboardSafeModalFrame>

        {/* ======================================================= */}
        {/* MODAL ĐÁNH GIÁ (EVALUATION) - UI MỚI GỌN GÀNG HƠN */}
        {/* ======================================================= */}
        <KeyboardSafeModalFrame visible={evalOpen} onRequestClose={() => setEvalOpen(false)} padding={10} backdropColor="rgba(0,0,0,0.5)">
              <View style={{ width: "100%", height: "80%", backgroundColor: "#F3F4F6", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}>
                
                {/* Header Modal */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
                  <Pressable onPress={() => setEvalOpen(false)} disabled={saving}><Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>Đóng</Text></Pressable>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đánh giá User</Text>
                  {isAdmin ? (
                    <Pressable onPress={onSaveEval} disabled={saving}><Text style={{ color: saving ? "#9CA3AF" : SKY, fontSize: 15, fontWeight: "bold" }}>{saving ? "Lưu..." : "Lưu"}</Text></Pressable>
                  ) : (
                    <Text style={{ color: "#9CA3AF", fontSize: 13, fontWeight: "700" }}>Xem</Text>
                  )}
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                >
                  
                  {/* 1. Điểm, Thái độ, Trình độ (GỌN LẠI VÀO 2 CỘT) */}
                  <SectionTitle icon="stats-chart-outline" title="Thông số cơ bản" />
                  <Card>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#E5E7EB' }}>
                        <Field label="Điểm (VD: 9/10)" value={evalDraft.score || ""} onChange={(t:any) => setEvalDraft((p) => ({ ...p, score: t }))} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Thái độ" value={evalDraft.attitude || ""} onChange={(t:any) => setEvalDraft((p) => ({ ...p, attitude: t }))} />
                      </View>
                    </View>
                    <Divider />
                    <Field label="Trình độ chuyên môn" value={evalDraft.skill || ""} onChange={(t:any) => setEvalDraft((p) => ({ ...p, skill: t }))} />
                  </Card>

                  <View style={{ height: 16 }} />

                  {/* 2. Đánh giá tổng quan (NÚT + ĐƯỢC ĐƯA LÊN TRÊN) */}
                  <SectionTitle 
                    icon="reader-outline" 
                    title="Tổng quan (Tối đa 3)" 
                    rightAction={
                      isAdmin && (!evalDraft.general || evalDraft.general.length < 3) && (
                        <Pressable onPress={() => setEvalDraft(p => ({...p, general: [...(p.general || []), ""]}))}>
                          <Text style={{ color: SKY_DARK, fontWeight: 'bold', fontSize: 14 }}>+ Thêm</Text>
                        </Pressable>
                      )
                    }
                  />
                  <Card>
                    {evalDraft.general && evalDraft.general.length > 0 ? (
                      evalDraft.general.map((item, index) => (
                        <View key={index}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}>
                             <View style={{ flex: 1 }}>
                               <Field 
                                  label={`Nội dung ${index + 1}`} 
                                  value={item} 
                                  onChange={(t:any) => {
                                    const newGen = [...(evalDraft.general || [])];
                                    newGen[index] = t;
                                    setEvalDraft(p => ({...p, general: newGen}));
                                  }} 
                               />
                             </View>
                             {isAdmin ? (
                               <Pressable style={{ padding: 8 }} onPress={() => {
                                  const newGen = (evalDraft.general || []).filter((_, i) => i !== index);
                                  setEvalDraft(p => ({...p, general: newGen}));
                               }}>
                                 <Ionicons name="trash" size={20} color="#EF4444"/>
                               </Pressable>
                             ) : null}
                          </View>
                          {index !== (evalDraft.general?.length || 0) - 1 && <Divider />}
                        </View>
                      ))
                    ) : (
                      <View style={{ padding: 16 }}><Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>Chưa có đánh giá tổng quan</Text></View>
                    )}
                  </Card>

                  <View style={{ height: 16 }} />

                  {/* 3. Lịch sử đánh giá chi tiết (NÚT + ĐƯỢC ĐƯA LÊN TRÊN) */}
                  <SectionTitle 
                    icon="list-outline" 
                    title="Chi tiết" 
                    rightAction={
                      isAdmin ? (
                        <Pressable onPress={() => setEvalDraft(p => ({...p, detailed: [{ text: "", date: new Date().toLocaleDateString('vi-VN') }, ...(p.detailed || [])]}))}>
                          <Text style={{ color: SKY_DARK, fontWeight: 'bold', fontSize: 14 }}>+ Đánh giá mới</Text>
                        </Pressable>
                      ) : null
                    }
                  />
                  <Card>
                    {evalDraft.detailed && evalDraft.detailed.length > 0 ? (
                      evalDraft.detailed.map((item, index) => (
                        <View key={index} style={{ padding: 12, borderBottomWidth: index !== (evalDraft.detailed?.length || 0) - 1 ? 1 : 0, borderColor: '#E5E7EB' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                             <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Bản ghi #{evalDraft.detailed!.length - index}</Text>
                             {isAdmin ? (
                               <Pressable onPress={() => {
                                  const newDet = (evalDraft.detailed || []).filter((_, i) => i !== index);
                                  setEvalDraft(p => ({...p, detailed: newDet}));
                               }}>
                                 <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Xóa</Text>
                               </Pressable>
                             ) : null}
                          </View>
                          
                          <TextInput 
                            value={item.date} 
                            onChangeText={(t:any) => {
                               const newDet = [...(evalDraft.detailed || [])];
                               newDet[index].date = t;
                               setEvalDraft(p => ({...p, detailed: newDet}));
                            }} 
                            placeholder="Ngày ĐG (VD: 25/10/2023)" 
                            style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 }}
                          />
                          <TextInput 
                            value={item.text} 
                            onChangeText={(t:any) => {
                               const newDet = [...(evalDraft.detailed || [])];
                               newDet[index].text = t;
                               setEvalDraft(p => ({...p, detailed: newDet}));
                            }} 
                            placeholder="Nội dung đánh giá..." 
                            multiline
                            style={{ backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, fontSize: 13, minHeight: 60 }}
                          />
                        </View>
                      ))
                    ) : (
                      <View style={{ padding: 16 }}><Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>Chưa có lịch sử đánh giá</Text></View>
                    )}
                  </Card>

                </ScrollView>
              </View>
        </KeyboardSafeModalFrame>

        <MediaPreviewModal
          item={mediaPreview}
          onClose={() => setMediaPreview(null)}
          onOpenLink={(url) => openExternalLink(url)}
        />

        {/* ======================================================= */}
        {/* PREVIEW IMAGE MODAL */}
        {/* ======================================================= */}
        <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
            <View style={{ paddingTop: 44, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => setPreviewOpen(false)} style={{ padding: 10 }}><Ionicons name="close" size={26} color="white" /></Pressable>
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 14 }}>
              {(previewKind === "cover" ? cover : avatar) ? <Image source={{ uri: previewKind === "cover" ? cover : avatar }} style={{ width: "100%", height: "100%", resizeMode: "contain", borderRadius: 12 }} /> : null}
            </View>
          </View>
        </Modal>

      </View>
    </Screen>
  );
}

/* ================== UI components ================== */
function IconBtn({ icon, label, onPress, danger, disabled }: any) {
  const bg = danger ? "rgba(239,68,68,0.9)" : "rgba(2,132,199,0.86)";
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: bg, opacity: disabled ? 0.55 : 1 }}>
      <Ionicons name={icon} size={16} color="white" />
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function SolidButton({ icon, label, onPress, disabled, style }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: SKY,
          borderWidth: 1,
          borderColor: SKY_DARK,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={16} color="#FFF" />
      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ icon, label, onPress, disabled, style }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: "#FFF",
          borderWidth: 1,
          borderColor: "#D1D5DB",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={16} color="#111827" />
      <Text style={{ color: "#111827", fontSize: 13, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function Chip({ icon, text }: any) {
  const safe = (text ?? "").trim() || "—";
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: SKY_SOFT, borderWidth: 1, borderColor: "#E5E7EB" }}>
      <Ionicons name={icon} size={14} color={SKY_DARK} />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>{safe}</Text>
    </View>
  );
}

function ProfileTabPill({ label, icon, active, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: active ? SKY_SOFT : "#FFF",
        borderWidth: 1,
        borderColor: active ? SKY_BORDER : "#E5E7EB",
      }}
    >
      <Ionicons name={icon} size={14} color={active ? SKY_DARK : "#6B7280"} />
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? SKY_DARK : "#475569" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ icon, title, rightAction }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Ionicons name={icon} size={18} color={SKY_DARK} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>{title}</Text>
      </View>
      {/* Nút bấm (nếu có) sẽ nằm ở đây, ngang hàng với Title */}
      {rightAction}
    </View>
  );
}

function Card({ children }: any) {
  return <View style={{ backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" }}>{children}</View>;
}

function Divider() { return <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />; }

function MediaPreviewModal({
  item,
  onClose,
  onOpenLink,
}: {
  item: MediaPreview | null;
  onClose: () => void;
  onOpenLink: (url: string) => void;
}) {
  const isImage = item?.kind === "image" || String(item?.mimeType || "").startsWith("image/");
  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: isImage ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.55)" }}>
        <View style={{ paddingTop: 44, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={onClose} style={{ padding: 10 }}>
            <Ionicons name="close" size={26} color="white" />
          </Pressable>
          <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", color: "white", fontWeight: "900" }}>
            {item?.name || "Xem trước"}
          </Text>
          <Pressable onPress={() => item?.url && onOpenLink(item.url)} style={{ padding: 10 }}>
            <Ionicons name="open-outline" size={22} color="white" />
          </Pressable>
        </View>

        {isImage && item?.url ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 14 }}>
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%", resizeMode: "contain", borderRadius: 12 }} />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", padding: 18 }}>
            <Card>
              <View style={{ padding: 16, alignItems: "center" }}>
                <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={fileIcon(item?.name, item?.mimeType)} size={28} color={SKY_DARK} />
                </View>
                <Text numberOfLines={3} style={{ marginTop: 12, fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" }}>
                  {item?.name || "Untitled"}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                  {formatBytes(item?.size)} • {formatDate(item?.createdAt)}
                </Text>
                <Pressable onPress={() => item?.url && onOpenLink(item.url)} style={{ marginTop: 16, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: SKY, borderWidth: 1, borderColor: SKY_DARK, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="open-outline" size={17} color="white" />
                  <Text style={{ color: "white", fontWeight: "900" }}>Mở link</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        )}
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value, onPressValue, valueColor, valueUnderline }: any) {
  return (
    <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
        <Ionicons name={icon} size={16} color="#111827" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "800" }}>{label}</Text>
        {onPressValue ? (
          <Pressable onPress={onPressValue} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "900", color: valueColor ?? SKY_DARK, textDecorationLine: valueUnderline ? "underline" : "none" }}>{value}</Text>
          </Pressable>
        ) : (
          <Text style={{ marginTop: 2, fontSize: 13, color: valueColor ?? "#111827", fontWeight: "900" }}>{value}</Text>
        )}
      </View>
    </View>
  );
}

function FileRow({ icon, name, meta, onPress, onDelete }: any) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color="#111827" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{name}</Text>
        <Text style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>{meta}</Text>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="trash-outline" size={16} color="#B91C1C" />
        </Pressable>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
  );
}

function Field({ label, value, onChange, multiline, keyboardType }: any) {
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "900", marginBottom: 8 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder="—" placeholderTextColor="#9CA3AF" multiline={multiline} keyboardType={keyboardType} style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: multiline ? 12 : 10, minHeight: multiline ? 96 : undefined, backgroundColor: "#F9FAFB", color: "#111827", fontSize: 13 }} />
    </View>
  );
}


