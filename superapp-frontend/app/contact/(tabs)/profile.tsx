import Screen from "@/components/Screen";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import { useAuth } from "@/lib/auth";
import { fetchMe, updateMe, uploadMedia } from "@/lib/contact/api";
import type { UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

type ProfileDraft = UserPublic["profile"];
const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const SKY_SOFT = "#E0F2FE";
const SKY_BORDER = "#7DD3FC";

function vOrDash(v?: string) {
  const s = (v ?? "").trim();
  return s ? s : "—";
}

function formatLocation(loc?: { city?: string; country?: string }) {
  const s = `${loc?.city || ""} ${loc?.country || ""}`.trim();
  return s ? s : "Chua them dia diem";
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

function imageAssetName(uri: string) {
  return uri.split("/").pop() || `image_${Date.now()}.jpg`;
}

function imageMimeType(name: string) {
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

type PreviewKind = "avatar" | "cover";

export default function ProfileMeScreen() {
  const { token, signOut } = useAuth();

  const [me, setMe] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(normalizeProfile(undefined));
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  // right-side upload menu
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);

  // image preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("cover");

  const cover = useMemo(
    () => (edit ? draft.coverUrl : me?.profile?.coverUrl) || "",
    [edit, draft, me],
  );
  const avatar = useMemo(
    () => (edit ? draft.avatarUrl : me?.profile?.avatarUrl) || "",
    [edit, draft, me],
  );

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const u = await fetchMe(token);
      setMe(u);
      setDraft(normalizeProfile(u.profile));
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tải được profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi tài khoản này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const onStartEdit = () => {
    if (!me) return;
    setDraft(normalizeProfile(me.profile));
    setEdit(true);
  };

  const onCancelEdit = () => {
    Alert.alert("Hủy thay đổi", "Bỏ tất cả thay đổi và quay lại?", [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy thay đổi",
        style: "destructive",
        onPress: () => {
          setDraft(normalizeProfile(me?.profile));
          setEdit(false);
        },
      },
    ]);
  };

  const onSave = async () => {
    if (!token) return;
    if (!draft.displayName.trim()) {
      Alert.alert("Thiếu thông tin", "Display name không được để trống.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMe(token, { profile: draft });
      setMe(updated);
      setDraft(normalizeProfile(updated.profile));
      setEdit(false);
      Alert.alert("Thành công", "Đã lưu hồ sơ.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  async function ensurePermissions() {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted)
      throw new Error("Bạn cần cấp quyền truy cập thư viện ảnh.");
    await ImagePicker.requestCameraPermissionsAsync();
  }

  const pickImage = async (
    mode: "camera" | "library",
  ): Promise<string | null> => {
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

  const doUpload = async (
    kind: "avatar" | "cover",
    mode: "camera" | "library",
  ) => {
    if (!token || !me) return;

    try {
      const uri = await pickImage(mode);
      if (!uri) return;

      Alert.alert("Xác nhận", "Upload ảnh này lên MinIO?", [
        { text: "Không", style: "cancel" },
        {
          text: "Upload",
          onPress: async () => {
            try {
              setUploading(kind);
              const name = imageAssetName(uri);
              const r = await uploadMedia(token, {
                scope: "user",
                ownerId: me.id,
                kind,
                files: [{ uri, name, type: imageMimeType(name) }],
              });
              if (r.user) {
                setMe(r.user);
                const updatedProfile = normalizeProfile(r.user.profile);
                setDraft((p) => ({
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
          <Text style={{ marginTop: 8, color: "#6B7280" }}>Dang tai ho so...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen top={0} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "#ECF1F7" }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 38 }}>
          <View style={{ backgroundColor: "#FFF" }}>
            <View
              style={{
                height: 232,
                backgroundColor: "#1F2937",
                position: "relative",
              }}
            >
              <Pressable onPress={() => openPreview("cover")} style={{ flex: 1 }}>
                {cover ? (
                  <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="image-outline" size={30} color="rgba(255,255,255,0.82)" />
                    <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.8)", fontWeight: "800" }}>
                      Chua co anh bia
                    </Text>
                  </View>
                )}
              </Pressable>

              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 92,
                  backgroundColor: "rgba(0,0,0,0.28)",
                }}
              />

              <View
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <HeaderIconButton icon="create-outline" onPress={onStartEdit} />
                <HeaderIconButton icon="log-out-outline" danger onPress={onLogout} />
              </View>

              <View
                style={{
                  position: "absolute",
                  left: 16,
                  bottom: -56,
                  zIndex: 20,
                }}
              >
                <Pressable onPress={() => openPreview("avatar")}>
                  <View
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: 56,
                      backgroundColor: "#E5E7EB",
                      borderWidth: 5,
                      borderColor: "#FFF",
                      overflow: "hidden",
                    }}
                  >
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="person-circle-outline" size={46} color="#6B7280" />
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      right: 2,
                      bottom: 2,
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "#E5E7EB",
                      borderWidth: 3,
                      borderColor: "#FFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="camera" size={16} color="#111827" />
                  </View>
                </Pressable>
              </View>

              {edit ? (
                <View style={{ position: "absolute", right: 14, bottom: -20 }}>
                  <Pressable
                    onPress={() => setUploadMenuOpen(true)}
                    style={{
                      flexDirection: "row",
                      gap: 7,
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: SKY,
                      borderWidth: 1,
                      borderColor: SKY_DARK,
                      shadowColor: "#000",
                      shadowOpacity: 0.16,
                      shadowRadius: 9,
                      elevation: 6,
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                    <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 12 }}>Tai anh</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 66, paddingBottom: 14 }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: "#0F172A" }}>
                {edit ? draft.displayName : vOrDash(me?.profile?.displayName)}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: "#475569", lineHeight: 18 }}>
                {edit ? (draft.bio?.trim() ? draft.bio : "Chua co tieu su") : vOrDash(me?.profile?.bio)}
              </Text>

              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <StatPill icon="at-outline" text={vOrDash(me?.profile?.username)} />
                <StatPill icon="location-outline" text={me?.profile?.location?.city || "Chua dat dia diem"} />
                <StatPill icon="briefcase-outline" text={me?.profile?.work || "Chua them cong viec"} />
              </View>

              <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                <SolidButton icon="create-outline" label="Chỉnh sửa hồ sơ" onPress={onStartEdit} style={{ flex: 1 }} />
                <OutlineButton
                  icon="images-outline"
                  label="Tải ảnh"
                  onPress={() => {
                    if (!edit) onStartEdit();
                    setUploadMenuOpen(true);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <SectionTitle icon="sparkles-outline" title="Giới thiệu" />
            <Card>
              <InfoRow icon="location-outline" label="Sống tại" value={formatLocation(me?.profile?.location)} />
              <Divider />
              <InfoRow icon="school-outline" label="Học vấn" value={vOrDash(me?.profile?.education)} />
              <Divider />
              <InfoRow icon="briefcase-outline" label="Công việc" value={vOrDash(me?.profile?.work)} />
            </Card>

            <View style={{ height: 14 }} />

            <SectionTitle icon="information-circle-outline" title="Thông tin cá nhân" />
            <Card>
              <InfoRow icon="mail-outline" label="Email" value={vOrDash(me?.email)} />
              <Divider />
              <InfoRow icon="call-outline" label="SDT" value={vOrDash(me?.profile?.phone)} />
              <Divider />
              <InfoRow icon="man-outline" label="Giới tính" value={vOrDash(me?.profile?.gender)} />
              <Divider />
              <InfoRow icon="calendar-outline" label="Ngày sinh" value={vOrDash(me?.profile?.birthday)} />
            </Card>
          </View>
        </ScrollView>
        <KeyboardSafeModalFrame visible={edit} onRequestClose={onCancelEdit} padding={10}>
              <View
                style={{
                  width: "100%",
                  height: "80%",
                  backgroundColor: "#F8FAFC",
                  borderRadius: 28,
                  overflow: "hidden",
                }}
              >
                <View style={{ alignItems: "center", paddingTop: 10 }}>
                  <View
                    style={{
                      width: 44,
                      height: 5,
                      borderRadius: 999,
                      backgroundColor: "#CBD5E1",
                    }}
                  />
                </View>

                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                    backgroundColor: "#FFF",
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>
                    Chỉnh sửa hồ sơ
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                    Cập nhật thông tin và lưu để áp dụng thay đổi.
                  </Text>

                  <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                    <ModalActionButton
                      icon="close-outline"
                      label="Đóng"
                      onPress={onCancelEdit}
                      disabled={saving || !!uploading}
                      tone="neutral"
                      style={{ flex: 1, minHeight: 46 }}
                    />
                    <ModalActionButton
                      icon="cloud-upload-outline"
                      label={uploading ? "Đang tải" : "Tải ảnh"}
                      onPress={() => setUploadMenuOpen(true)}
                      disabled={saving || !!uploading}
                      tone="subtle"
                      style={{ flex: 1, minHeight: 46 }}
                    />
                    <ModalActionButton
                      icon="checkmark-outline"
                      label={saving ? "Đang lưu" : "Lưu"}
                      onPress={onSave}
                      disabled={saving || !!uploading}
                      tone="primary"
                      style={{ flex: 1, minHeight: 46 }}
                    />
                  </View>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                >
                  <FormSectionTitle title="Thông tin cơ bản" />
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

                  <FormSectionTitle title="Liên hẹ và tùy chọn" />
                  <Card>
                    <Field
                      label="SDT"
                      value={draft.phone || ""}
                      onChange={(t) => setDraft((p) => ({ ...p, phone: t }))}
                      keyboardType="phone-pad"
                    />
                    <Divider />
                    <Field
                      label="Giới tính"
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

                  <FormSectionTitle title="Học tập và công việc" />
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
                        setDraft((p) => ({
                          ...p,
                          location: { ...(p.location || {}), city: t },
                        }))
                      }
                    />
                    <Divider />
                    <Field
                      label="Quốc gia"
                      value={draft.location?.country || ""}
                      onChange={(t) =>
                        setDraft((p) => ({
                          ...p,
                          location: { ...(p.location || {}), country: t },
                        }))
                      }
                    />
                  </Card>
                </ScrollView>
              </View>
        </KeyboardSafeModalFrame>
        {/* ===== Upload menu (right button) ===== */}
        <Modal
          visible={uploadMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setUploadMenuOpen(false)}
        >
          <Pressable
            onPress={() => setUploadMenuOpen(false)}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.45)",
              justifyContent: "flex-end",
            }}
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
                <View
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 99,
                    backgroundColor: "#E5E7EB",
                  }}
                />
              </View>

              <Text
                style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}
              >
                Tải ảnh lên
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
                Chọn loại ảnh bạn muốn chỉnh sửa (Avatar / Ảnh bìa)
              </Text>

              <View style={{ height: 12 }} />

              <ActionRow
                icon="person-circle-outline"
                title="Đởi ảnh đại diện"
                subtitle={
                  uploading === "avatar" ? "Dang upload..." : "Chon anh va upload"
                }
                onPress={() => {
                  setUploadMenuOpen(false);
                  Alert.alert("Ảnh đại diện", "Chọn nguồn ảnh", [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Chụp ảnh",
                      onPress: () => doUpload("avatar", "camera"),
                    },
                    {
                      text: "Thư viện",
                      onPress: () => doUpload("avatar", "library"),
                    },
                  ]);
                }}
              />

              <ActionRow
                icon="image-outline"
                title="Đổi ảnh bìa"
                subtitle={
                  uploading === "cover" ? "Đang upload..." : "Chọn ảnh và upload"
                }
                onPress={() => {
                  setUploadMenuOpen(false);
                  Alert.alert("Ảnh bìa", "Chonnj nguồn ảnh", [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Chụp ảnh",
                      onPress: () => doUpload("cover", "camera"),
                    },
                    {
                      text: "Thư viện",
                      onPress: () => doUpload("cover", "library"),
                    },
                  ]);
                }}
              />

              {!edit ? (
                <View
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: "#FEE2E2",
                  }}
                >
                  <Text
                    style={{
                      color: "#991B1B",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    Lưu ý bạn cần bấm sửa trước khi chụp ảnh.
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 10 }} />
            </Pressable>
          </Pressable>
        </Modal>

        {/* ===== Image preview modal ===== */}
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
              <Pressable
                onPress={() => setPreviewOpen(false)}
                style={{ padding: 10 }}
              >
                <Ionicons name="close" size={26} color="white" />
              </Pressable>
              <Text style={{ color: "white", fontWeight: "900" }}>
                {previewKind === "cover" ? "Anh bia" : "Anh dai dien"}
              </Text>
              <View style={{ width: 46 }} />
            </View>

            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 14,
              }}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={{
                    width: "100%",
                    height: "100%",
                    resizeMode: "contain",
                    borderRadius: 12,
                  }}
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

function HeaderIconButton({
  icon,
  onPress,
  danger,
}: {
  icon: any;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: danger ? "rgba(190,24,93,0.9)" : "rgba(15,23,42,0.62)",
        borderWidth: 1,
        borderColor: danger ? "rgba(251,113,133,0.9)" : "rgba(255,255,255,0.28)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon} size={18} color="#FFF" />
    </Pressable>
  );
}

function SolidButton({
  icon,
  label,
  onPress,
  disabled,
  style,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
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
      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function OutlineButton({
  icon,
  label,
  onPress,
  disabled,
  style,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
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
      <Text style={{ color: "#111827", fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatPill({ icon, text }: { icon: any; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#F8FAFF",
        borderWidth: 1,
        borderColor: "#DCE7FF",
      }}
    >
      <Ionicons name={icon} size={14} color="#1E40AF" />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#0F172A" }}>
        {text}
      </Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: SKY_SOFT,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Ionicons name={icon} size={18} color={SKY_DARK} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>
        {title}
      </Text>
    </View>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        marginBottom: 8,
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.2,
        color: "#475569",
      }}
    >
      {title}
    </Text>
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
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
        <Text
          style={{
            marginTop: 2,
            fontSize: 13,
            color: "#111827",
            fontWeight: "900",
          }}
        >
          {value}
        </Text>
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
      <Text
        style={{
          fontSize: 12,
          color: "#6B7280",
          fontWeight: "900",
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="-"
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

function ModalActionButton({
  icon,
  label,
  onPress,
  disabled,
  tone,
  style,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone: "neutral" | "subtle" | "primary";
  style?: any;
}) {
  const ui =
    tone === "primary"
      ? { bg: SKY, bd: SKY_DARK, fg: "#FFF" }
      : tone === "subtle"
        ? { bg: SKY_SOFT, bd: SKY_BORDER, fg: SKY_DARK }
        : { bg: "#FFF", bd: "#D1D5DB", fg: "#111827" };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: ui.bg,
          borderWidth: 1,
          borderColor: ui.bd,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={16} color={ui.fg} />
      <Text style={{ color: ui.fg, fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
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
        backgroundColor: SKY_SOFT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={SKY_DARK} />
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



