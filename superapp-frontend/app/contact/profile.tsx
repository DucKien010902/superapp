import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { fetchMe, updateMe } from "@/lib/contact/api";
import type { UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "#6B7280" }}>
            Đang tải hồ sơ…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen top={0} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        {/* ======= TOP HEADER (FB-like) ======= */}
        <View style={{ backgroundColor: "white" }}>
          {/* Cover */}
          <View
            style={{
              height: 210,
              backgroundColor: "#111827",
              position: "relative",
            }}
          >
            <Pressable onPress={() => openPreview("cover")} style={{ flex: 1 }}>
              {cover ? (
                <Image
                  source={{ uri: cover }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text
                    style={{
                      marginTop: 6,
                      color: "rgba(255,255,255,0.75)",
                      fontWeight: "800",
                    }}
                  >
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

            {/* Top actions: edit/save/cancel + logout */}
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
                <>
                  <IconBtn
                    icon="create-outline"
                    label="Sửa"
                    onPress={onStartEdit}
                  />
                  <IconBtn
                    icon="log-out-outline"
                    label="Đăng xuất"
                    danger
                    onPress={onLogout}
                  />
                </>
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

            {/* Avatar floating */}
            <View
              style={{
                position: "absolute",
                left: 16,
                bottom: -44,
                zIndex: 50,
                elevation: 50,
              }}
            >
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
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={40}
                        color="#6B7280"
                      />
                    </View>
                  )}
                </View>

                {/* small camera badge (FB vibe) */}
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

            {/* ===== Right upload button (requirement) ===== */}
            <View
              style={{
                position: "absolute",
                right: 14,
                bottom: -18,
                display: edit ? "flex" : "none",
              }}
            >
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
                <Text
                  style={{ color: "white", fontWeight: "900", fontSize: 12 }}
                >
                  Tải ảnh
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Name + actions row */}
          <View
            style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 }}
          >
            <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>
              {edit ? draft.displayName : vOrDash(me?.profile?.displayName)}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: "#6B7280" }}>
              {edit
                ? draft.bio?.trim()
                  ? draft.bio
                  : "—"
                : vOrDash(me?.profile?.bio)}
            </Text>

            {/* quick chips */}
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Chip
                icon="location-outline"
                text={me?.profile?.location?.city || "Chưa đặt địa điểm"}
              />
              <Chip
                icon="school-outline"
                text={me?.profile?.education || "Chưa thêm học vấn"}
              />
              <Chip
                icon="briefcase-outline"
                text={me?.profile?.work || "Chưa thêm công việc"}
              />
            </View>
          </View>
        </View>

        {/* ===== Body ===== */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            {!edit ? (
              <>
                <SectionTitle
                  icon="information-circle-outline"
                  title="Thông tin cá nhân"
                />

                <Card>
                  <InfoRow
                    icon="at-outline"
                    label="Username"
                    value={vOrDash(me?.profile?.username)}
                  />
                  <Divider />
                  <InfoRow
                    icon="mail-outline"
                    label="Email"
                    value={vOrDash(me?.email)}
                  />
                  <Divider />
                  <InfoRow
                    icon="call-outline"
                    label="SĐT"
                    value={vOrDash(me?.profile?.phone)}
                  />
                  <Divider />
                  <InfoRow
                    icon="man-outline"
                    label="Giới tính"
                    value={vOrDash(me?.profile?.gender)}
                  />
                  <Divider />
                  <InfoRow
                    icon="calendar-outline"
                    label="Ngày sinh"
                    value={vOrDash(me?.profile?.birthday)}
                  />
                  <Divider />
                  <InfoRow
                    icon="navigate-outline"
                    label="Địa điểm"
                    value={
                      me?.profile?.location?.city ||
                      me?.profile?.location?.country
                        ? `${me?.profile?.location?.city || ""} ${me?.profile?.location?.country || ""}`.trim()
                        : "—"
                    }
                  />
                </Card>
              </>
            ) : (
              <>
                <SectionTitle icon="create-outline" title="Chỉnh sửa hồ sơ" />

                <Card>
                  <Field
                    label="Display name *"
                    value={draft.displayName}
                    onChange={(t) =>
                      setDraft((p) => ({ ...p, displayName: t }))
                    }
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

                <Pressable
                  onPress={onLogout}
                  style={{
                    marginTop: 14,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    opacity: saving || uploading ? 0.7 : 1,
                  }}
                  disabled={saving || !!uploading}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    Đăng xuất
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>

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
                Chọn loại ảnh bạn muốn sửa (Avatar / Ảnh bìa)
              </Text>

              <View style={{ height: 12 }} />

              <ActionRow
                icon="person-circle-outline"
                title="Đổi ảnh đại diện"
                subtitle={
                  uploading === "avatar" ? "Đang upload…" : "Chọn ảnh và upload"
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
                  uploading === "cover" ? "Đang upload…" : "Chọn ảnh và upload"
                }
                onPress={() => {
                  setUploadMenuOpen(false);
                  Alert.alert("Ảnh bìa", "Chọn nguồn ảnh", [
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
                    Lưu ý: Bạn cần bấm “Sửa” trước khi đổi ảnh.
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
                {previewKind === "cover" ? "Ảnh bìa" : "Ảnh đại diện"}
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
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827" }}>
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
