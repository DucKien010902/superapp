import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  acceptFriend,
  adminDeleteUser,
  adminUpdateUser,
  cancelOrUnfriend,
  fetchUserById,
  openDM,
  requestFriend,
} from "@/lib/contact/api";
import type { Relationship, UserEvaluation, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

  // admin mode
  const isAdmin = String(me?.role || "") === "admin";
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  // Profile Edit Modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(normalizeProfile(undefined));

  // Evaluation Edit Modal
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalDraft, setEvalDraft] = useState<UserEvaluation>(normalizeEvaluation(undefined));

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
      Alert.alert("Thành công", "Đã lưu hồ sơ.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // --- ACTIONS EVALUATION ---
  const onStartEval = () => {
    if (!isAdmin) return;
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
      Alert.alert("Thành công", "Đã lưu đánh giá.");
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
              Alert.alert("Thành công", "Đã xóa người dùng", [
                { text: "OK", onPress: () => router.back() }
              ]);
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
    try {
      const uri = await pickImage(mode);
      if (!uri) return;
      Alert.alert("Xác nhận", "Upload ảnh này?", [
        { text: "Không", style: "cancel" },
        {
          text: "Upload", onPress: async () => {
            try {
              setUploading(kind);
              const url = await uploadImageToCloudinary(uri);
              setProfileDraft((p) => ({ ...p, [kind === "avatar" ? "avatarUrl" : "coverUrl"]: url }));
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

  const openPreview = (kind: PreviewKind) => {
    const has = kind === "cover" ? user?.profile?.coverUrl : user?.profile?.avatarUrl;
    if (!has) return;
    setPreviewKind(kind);
    setPreviewOpen(true);
  };

  if (loading) {
    return (
      <Screen top={0} bottom={0}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Đang tải…</Text>
        </View>
      </Screen>
    );
  }

  const phoneRaw = (user?.profile?.phone ?? "").trim();
  const hasPhone = !!toTel(phoneRaw);
  const cover = user?.profile?.coverUrl || "";
  const avatar = user?.profile?.avatarUrl || "";

  return (
    <Screen top={0} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ======================================================= */}
          {/* MÀN HÌNH CHÍNH */}
          {/* ======================================================= */}
          <View style={{ backgroundColor: "white" }}>
            <View style={{ height: 160, backgroundColor: "#111827", position: "relative" }}>
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

              <View style={{ position: "absolute", left: 16, bottom: -44, zIndex: 50, elevation: 50 }}>
                <Pressable onPress={() => openPreview("avatar")}>
                  <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#E5E7EB", borderWidth: 5, borderColor: "white", overflow: "hidden" }}>
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

            <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
                {vOrDash(user?.profile?.displayName)}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
                {user?.profile?.bio?.trim() ? user!.profile!.bio! : "Chưa có tiểu sử"}
              </Text>

              {!isAdmin && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <Pressable onPress={onPrimary} disabled={busy} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "#1877F2", alignItems: "center", opacity: busy ? 0.7 : 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
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

              {/* NÚT XEM ĐÁNH GIÁ (Chỉ Admin) */}
              {isAdmin && (
                <Pressable onPress={onStartEval} style={{ marginTop: 14, backgroundColor: '#FEF3C7', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FDE68A' }}>
                   <Ionicons name="star-outline" size={18} color="#D97706" />
                   <Text style={{ marginLeft: 8, color: '#D97706', fontWeight: 'bold', fontSize: 14 }}>Xem đánh giá chi tiết (Admin)</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ======================================================= */}
          {/* THÔNG TIN CÔNG KHAI (Đã khôi phục đủ các trường) */}
          {/* ======================================================= */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <SectionTitle icon="information-circle-outline" title="Thông tin công khai" />
            <Card>
              <InfoRow icon="at-outline" label="Username" value={vOrDash(user?.profile?.username)} />
              <Divider />
              <InfoRow icon="mail-outline" label="Email" value={vOrDash(user?.email)} />
              <Divider />
              <InfoRow icon="call-outline" label="SĐT" value={vOrDash(user?.profile?.phone)} valueColor={hasPhone ? "#2563EB" : "#111827"} valueUnderline={hasPhone} onPressValue={hasPhone ? () => callPhone(user?.profile?.phone) : undefined} />
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
                <View style={{ padding: 12 }}><Text style={{ fontSize: 13, color: "#6B7280" }}>—</Text></View>
              )}
            </Card>

            {/* NÚT XÓA NGƯỜI DÙNG Ở CUỐI CÙNG */}
            {isAdmin && (
               <View style={{ marginTop: 40, alignItems: 'center' }}>
                 <Pressable onPress={onDeleteUser} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Xóa người dùng này</Text>
                 </Pressable>
                 {/* <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 6 }}>Hành động này không thể hoàn tác</Text> */}
               </View>
            )}

          </View>
        </ScrollView>

        {/* ======================================================= */}
        {/* MODAL SỬA PROFILE (Đã khôi phục đủ trường) */}
        {/* ======================================================= */}
        <Modal visible={editProfileOpen} transparent animationType="fade" onRequestClose={() => setEditProfileOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ width: "90%", maxHeight: "75%", backgroundColor: "#F3F4F6", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
                  <Pressable onPress={() => setEditProfileOpen(false)} disabled={saving || !!uploading}><Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>Hủy</Text></Pressable>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Chỉnh sửa hồ sơ</Text>
                  <Pressable onPress={onSaveProfile} disabled={saving || !!uploading}><Text style={{ color: saving || !!uploading ? "#9CA3AF" : "#1877F2", fontSize: 15, fontWeight: "bold" }}>{saving ? "Lưu..." : "Lưu"}</Text></Pressable>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  <SectionTitle icon="camera-outline" title="Hình ảnh" />
                  <ActionRow icon="person-circle-outline" title="Đổi ảnh đại diện" subtitle={uploading === "avatar" ? "Đang upload…" : "Chọn ảnh từ máy"} onPress={() => Alert.alert("Ảnh đại diện", "Chọn nguồn ảnh", [{ text: "Hủy", style: "cancel" }, { text: "Thư viện", onPress: () => doUpload("avatar", "library") }])} />
                  <ActionRow icon="image-outline" title="Đổi ảnh bìa" subtitle={uploading === "cover" ? "Đang upload…" : "Chọn ảnh từ máy"} onPress={() => Alert.alert("Ảnh bìa", "Chọn nguồn ảnh", [{ text: "Hủy", style: "cancel" }, { text: "Thư viện", onPress: () => doUpload("cover", "library") }])} />
                  
                  <View style={{ height: 16 }} />
                  
                  <SectionTitle icon="document-text-outline" title="Thông tin cá nhân" />
                  <Card>
                    <Field label="Display name *" value={profileDraft.displayName} onChange={(t:any) => setProfileDraft((p) => ({ ...p, displayName: t }))} />
                    <Divider />
                    <Field label="Username" value={profileDraft.username || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, username: t }))} />
                    <Divider />
                    <Field label="Bio" value={profileDraft.bio || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, bio: t }))} multiline />
                  </Card>

                  <View style={{ height: 12 }} />

                  <Card>
                    <Field label="SĐT" value={profileDraft.phone || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />
                    <Divider />
                    <Field label="Giới tính (male/female/other)" value={profileDraft.gender || ""} onChange={(t:any) => setProfileDraft((p) => ({ ...p, gender: t }))} />
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
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* ======================================================= */}
        {/* MODAL ĐÁNH GIÁ (EVALUATION) - UI MỚI GỌN GÀNG HƠN */}
        {/* ======================================================= */}
        <Modal visible={evalOpen} transparent animationType="slide" onRequestClose={() => setEvalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ width: "95%", maxHeight: "85%", backgroundColor: "#F3F4F6", borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}>
                
                {/* Header Modal */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#E5E7EB" }}>
                  <Pressable onPress={() => setEvalOpen(false)} disabled={saving}><Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>Đóng</Text></Pressable>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đánh giá User</Text>
                  <Pressable onPress={onSaveEval} disabled={saving}><Text style={{ color: saving ? "#9CA3AF" : "#1877F2", fontSize: 15, fontWeight: "bold" }}>{saving ? "Lưu..." : "Lưu"}</Text></Pressable>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }}>
                  
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
                      (!evalDraft.general || evalDraft.general.length < 3) && (
                        <Pressable onPress={() => setEvalDraft(p => ({...p, general: [...(p.general || []), ""]}))}>
                          <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>+ Thêm</Text>
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
                             <Pressable style={{ padding: 8 }} onPress={() => {
                                const newGen = (evalDraft.general || []).filter((_, i) => i !== index);
                                setEvalDraft(p => ({...p, general: newGen}));
                             }}>
                               <Ionicons name="trash" size={20} color="#EF4444"/>
                             </Pressable>
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
                      <Pressable onPress={() => setEvalDraft(p => ({...p, detailed: [{ text: "", date: new Date().toLocaleDateString('vi-VN') }, ...(p.detailed || [])]}))}>
                        <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>+ Đánh giá mới</Text>
                      </Pressable>
                    }
                  />
                  <Card>
                    {evalDraft.detailed && evalDraft.detailed.length > 0 ? (
                      evalDraft.detailed.map((item, index) => (
                        <View key={index} style={{ padding: 12, borderBottomWidth: index !== (evalDraft.detailed?.length || 0) - 1 ? 1 : 0, borderColor: '#E5E7EB' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                             <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#374151' }}>Bản ghi #{evalDraft.detailed!.length - index}</Text>
                             <Pressable onPress={() => {
                                const newDet = (evalDraft.detailed || []).filter((_, i) => i !== index);
                                setEvalDraft(p => ({...p, detailed: newDet}));
                             }}>
                               <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Xóa</Text>
                             </Pressable>
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
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
  const bg = danger ? "rgba(239,68,68,0.9)" : "rgba(17,24,39,0.7)";
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: bg, opacity: disabled ? 0.55 : 1 }}>
      <Ionicons name={icon} size={16} color="white" />
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function Chip({ icon, text }: any) {
  const safe = (text ?? "").trim() || "—";
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#E5E7EB" }}>
      <Ionicons name={icon} size={14} color="#1D4ED8" />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>{safe}</Text>
    </View>
  );
}

function SectionTitle({ icon, title, rightAction }: any) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Ionicons name={icon} size={18} color="#1D4ED8" />
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
            <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "900", color: valueColor ?? "#2563EB", textDecorationLine: valueUnderline ? "underline" : "none" }}>{value}</Text>
          </Pressable>
        ) : (
          <Text style={{ marginTop: 2, fontSize: 13, color: valueColor ?? "#111827", fontWeight: "900" }}>{value}</Text>
        )}
      </View>
    </View>
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

function ActionRow({ icon, title, subtitle, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 10, padding: 12, borderRadius: 16, backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", gap: 10, alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={20} color="#1D4ED8" /></View>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: "900", color: "#111827" }}>{title}</Text><Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </Pressable>
  );
}