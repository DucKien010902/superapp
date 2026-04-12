import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import SearchBar from "@/components/contact/SearchBar";
import GroupAboutTab from "@/components/contact/group/GroupAboutTab";
import { useAuth } from "@/lib/auth";
import {
  addGroupMember,
  deleteMedia,
  fetchFriends,
  fetchGroupById,
  fetchGroupMembers,
  fetchMe,
  removeGroupMember,
  uploadMedia,
} from "@/lib/contact/api";
import type { Friend, Group } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type TabKey = "about" | "members" | "images" | "media";
const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const SKY_SOFT = "#E0F2FE";
const SKY_BORDER = "#7DD3FC";

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

async function openExternalLink(url?: string) {
  const finalUrl = String(url || "").trim();
  if (!finalUrl) return;
  const ok = await Linking.canOpenURL(finalUrl);
  if (!ok) {
    Alert.alert("Liên kết không hợp lệ", "Không thể mở liên kết này.");
    return;
  }
  Linking.openURL(finalUrl);
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

function FileRow({
  icon,
  name,
  meta,
  onPress,
  onDelete,
}: {
  icon: any;
  name: string;
  meta: string;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
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
      <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>{title}</Text>
    </View>
  );
}

function TabPill({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: active ? SKY : "transparent",
      }}
    >
      <Ionicons name={icon} size={16} color={active ? "white" : "#6B7280"} />
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "white" : "#6B7280" }}>{label}</Text>
    </Pressable>
  );
}

function GroupHeader({ group, memberCount }: { group: Group; memberCount: number }) {
  return (
    <Card>
      <View style={{ padding: 14, backgroundColor: "#EEF4FF" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: SKY_SOFT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="people-outline" size={22} color={SKY_DARK} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: "900", color: "#0F172A" }}>{group.name}</Text>
            <Text style={{ marginTop: 2, color: "#475569", fontSize: 12 }}>
              {memberCount} thành viên • {group.visibility === "public" ? "Công khai" : "Riêng tư"}
            </Text>
          </View>
        </View>
      </View>

      <Divider />

      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "700" }}>Mô tả nhóm</Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: "#111827", lineHeight: 19 }}>
          {group.description?.trim() ? group.description : "Chưa có mô tả."}
        </Text>
      </View>
    </Card>
  );
}

function GroupImagesTab({
  images,
  canManage,
  uploading,
  onUpload,
  onDelete,
  onPreview,
}: {
  images: Group["images"];
  canManage: boolean;
  uploading: boolean;
  onUpload: () => void;
  onDelete: (id?: string) => void;
  onPreview: (item: MediaPreview) => void;
}) {
  const items = (images || []).filter((item) => !!item.url);
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle icon="images-outline" title="Ảnh nhóm" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {canManage ? (
          <Pressable
            onPress={onUpload}
            disabled={uploading}
            style={{
              width: "31%",
              aspectRatio: 1,
              borderRadius: 18,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: SKY_BORDER,
              backgroundColor: SKY_SOFT,
              alignItems: "center",
              justifyContent: "center",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            <Ionicons name={uploading ? "cloud-upload-outline" : "add"} size={28} color={SKY_DARK} />
            <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "800", color: SKY_DARK }}>
              {uploading ? "Đang tải" : "Thêm"}
            </Text>
          </Pressable>
        ) : null}

        {items.length === 0 ? (
          <Card>
            <View style={{ padding: 12, width: "100%" }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có ảnh nào.</Text>
            </View>
          </Card>
        ) : null}

        {items.map((item, idx) => (
          <Pressable
            key={item.id || `${item.url}-${idx}`}
            onPress={() => onPreview({ kind: "image", url: item.url, name: item.caption || "Ảnh nhóm" })}
            style={{
              width: "31%",
              aspectRatio: 1,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
            }}
          >
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} />
            {canManage && item.id ? (
              <Pressable
                onPress={() => onDelete(item.id)}
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
  );
}

function GroupFilesTab({
  files,
  canManage,
  uploading,
  onUpload,
  onDelete,
  onPreview,
}: {
  files: Group["documents"];
  canManage: boolean;
  uploading: boolean;
  onUpload: () => void;
  onDelete: (id?: string) => void;
  onPreview: (item: MediaPreview) => void;
}) {
  const items = files || [];
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionTitle icon="folder-open-outline" title="Tài liệu nhóm" />
      <Card>
        {canManage ? (
          <>
            <Pressable
              onPress={onUpload}
              disabled={uploading}
              style={{
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "#F8FBFF",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={uploading ? "cloud-upload-outline" : "add"} size={22} color={SKY_DARK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>
                  {uploading ? "Đang upload..." : "Thêm file"}
                </Text>
                <Text style={{ marginTop: 2, color: "#6B7280", fontSize: 12 }}>
                  Chọn một hoặc nhiều file để lưu vào MinIO
                </Text>
              </View>
            </Pressable>
            <Divider />
          </>
        ) : null}

        {items.length === 0 ? (
          <View style={{ padding: 12 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có tài liệu nào.</Text>
          </View>
        ) : null}

        {items.map((file, idx) => (
          <View key={file.id || `${file.url}-${idx}`}>
            <FileRow
              icon={fileIcon(file.name, file.mimeType)}
              name={file.name || "Untitled"}
              meta={`${formatBytes(file.size)} • ${formatDate(file.createdAt)}`}
              onPress={() =>
                onPreview({
                  kind: String(file.mimeType || "").startsWith("image/") ? "image" : "file",
                  url: file.url,
                  name: file.name || "Untitled",
                  mimeType: file.mimeType,
                  size: file.size,
                  createdAt: file.createdAt,
                })
              }
              onDelete={canManage && file.id ? () => onDelete(file.id) : undefined}
            />
            {idx !== items.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("about");
  const [meFriend, setMeFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberRows, setMemberRows] = useState<{ userId: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [membersQ, setMembersQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const [busyAdd, setBusyAdd] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [aboutOverlay, setAboutOverlay] = useState<ReactNode | null>(null);

  const reload = useCallback(async () => {
    if (!token || !id) return;
    setErr(null);
    setLoading(true);
    try {
      const [me, fs, g, ms] = await Promise.all([
        fetchMe(token),
        fetchFriends(token),
        fetchGroupById(token, id),
        fetchGroupMembers(token, id),
      ]);

      const meAsFriend: Friend = {
        id: me.id,
        name: me.profile?.displayName || "Bạn",
        phone: me.profile?.phone || "",
        avatar: me.profile?.avatarUrl || "",
        isOnline: false,
      };

      setMeFriend(meAsFriend);
      setFriends(fs);
      setGroup(g);
      setMemberRows(ms.items || []);
    } catch (e: any) {
      setErr(e?.message || "Không tải được chi tiết nhóm");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const myRole = (group?.myRole || "member") as "owner" | "admin" | "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const friendsMap = useMemo(() => {
    const all = meFriend ? [meFriend, ...friends] : friends;
    return new Map(all.map((f) => [f.id, f]));
  }, [friends, meFriend]);

  const members = useMemo(() => {
    const q = membersQ.trim().toLowerCase();
    return memberRows
      .map((m) => {
        const f = friendsMap.get(m.userId);
        const friend: Friend =
          f || {
            id: m.userId,
            name: `Người dùng ${String(m.userId).slice(-4)}`,
            phone: "",
            avatar: "",
          };
        return { friend, role: m.role as "owner" | "admin" | "member" };
      })
      .filter((x) => {
        if (!q) return true;
        return x.friend.name.toLowerCase().includes(q) || (x.friend.phone || "").toLowerCase().includes(q);
      });
  }, [memberRows, friendsMap, membersQ]);

  const existedIds = useMemo(() => new Set(memberRows.map((m) => m.userId)), [memberRows]);

  const candidatesToAdd = useMemo(() => {
    const q = pickerQ.trim().toLowerCase();
    return friends
      .filter((f) => !existedIds.has(f.id))
      .filter((f) => {
        if (!q) return true;
        return f.name?.toLowerCase().includes(q) || (f.phone || "").toLowerCase().includes(q);
      });
  }, [friends, existedIds, pickerQ]);

  const addMember = async (userId: string) => {
    if (!token || !id) return;
    setBusyAdd(true);
    try {
      await addGroupMember(token, id, userId);
      await reload();
    } finally {
      setBusyAdd(false);
    }
  };

  const onKick = async (userId: string, name: string) => {
    if (!token || !id) return;
    Alert.alert("Xóa thành viên", `Bạn muốn xóa ${name} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await removeGroupMember(token, id, userId);
          await reload();
        },
      },
    ]);
  };

  const uploadGroupImages = async () => {
    if (!token || !id || !canManage) return;
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
      const r = await uploadMedia(token, { scope: "group", ownerId: String(id), kind: "image", files });
      if (r.group) setGroup(r.group);
    } catch (e: any) {
      Alert.alert("Lỗi upload", e?.message || "Không upload được ảnh");
    } finally {
      setUploadingMedia(false);
    }
  };

  const uploadGroupFiles = async () => {
    if (!token || !id || !canManage) return;
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
      const r = await uploadMedia(token, { scope: "group", ownerId: String(id), kind: "file", files });
      if (r.group) setGroup(r.group);
    } catch (e: any) {
      Alert.alert("Lỗi upload", e?.message || "Không upload được file");
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteGroupMedia = (kind: "image" | "file", mediaId?: string) => {
    if (!token || !id || !mediaId || !canManage) return;
    Alert.alert("Xóa mục này", "Bạn muốn xóa mục này khỏi nhóm và MinIO?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await deleteMedia(token, {
              scope: "group",
              ownerId: String(id),
              kind,
              mediaId,
            });
            if (r.group) setGroup(r.group);
          } catch (e: any) {
            Alert.alert("Lỗi", e?.message || "Không xóa được mục này");
          }
        },
      },
    ]);
  };

  const memberCount = memberRows?.length || group?.memberIds?.length || 0;

  if (loading) {
    return (
      <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đang tải...</Text>
        </View>
      </Screen>
    );
  }

  if (err || !group) {
    return (
      <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Không vào được nhóm</Text>
              <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{err || "Không tìm thấy nhóm"}</Text>
              <Pressable onPress={reload} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: SKY, borderWidth: 1, borderColor: SKY_DARK, alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "900" }}>Tải lại</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "#ECF1F7" }} top={12} bottom={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
          <GroupHeader group={group} memberCount={memberCount} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", gap: 8, backgroundColor: "white", padding: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", alignSelf: "flex-start" }}>
            <TabPill active={tab === "about"} label="Nhóm" icon="information-circle-outline" onPress={() => setTab("about")} />
            <TabPill active={tab === "members"} label="Thành viên" icon="people-outline" onPress={() => setTab("members")} />
            <TabPill active={tab === "images"} label="Ảnh" icon="images-outline" onPress={() => setTab("images")} />
            <TabPill active={tab === "media"} label="Tài liệu" icon="folder-outline" onPress={() => setTab("media")} />
          </View>
        </View>

        {tab === "about" ? (
          <GroupAboutTab
            token={token || ""}
            groupId={String(id || "")}
            group={group}
            isOwner={myRole === "owner"}
            onUpdated={reload}
            onModalOverlayChange={setAboutOverlay}
          />
        ) : tab === "members" ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Card>
              <View style={{ padding: 12, paddingBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>Danh sách thành viên</Text>
                  {canManage ? (
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SKY, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </Pressable>
                  ) : null}
                </View>

                <View style={{ marginTop: 10 }}>
                  <SearchBar value={membersQ} onChange={setMembersQ} placeholder="Tìm thành viên theo tên / SĐT" />
                </View>
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{members.length} kết quả</Text>
              </View>

              <Divider />

              {members.length === 0 ? (
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Không có thành viên phù hợp.</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
                  {members.map((item, idx) => {
                    const isMe = meFriend?.id === item.friend.id;
                    const canKick = canManage && item.role !== "owner" && !isMe && !(myRole === "admin" && item.role === "admin");
                    return (
                      <View key={item.friend.id}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <ContactRow item={item.friend} onPress={() => router.push(`/contact/user/${item.friend.id}`)} />
                          </View>
                          {canKick ? (
                            <Pressable onPress={() => onKick(item.friend.id, item.friend.name)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEE2E2" }}>
                              <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                            </Pressable>
                          ) : null}
                        </View>
                        {idx !== members.length - 1 ? <Divider /> : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        ) : tab === "images" ? (
          <GroupImagesTab
            images={group.images || []}
            canManage={canManage}
            uploading={uploadingMedia}
            onUpload={uploadGroupImages}
            onDelete={(mediaId) => deleteGroupMedia("image", mediaId)}
            onPreview={setMediaPreview}
          />
        ) : (
          <GroupFilesTab
            files={group.documents || []}
            canManage={canManage}
            uploading={uploadingMedia}
            onUpload={uploadGroupFiles}
            onDelete={(mediaId) => deleteGroupMedia("file", mediaId)}
            onPreview={setMediaPreview}
          />
        )}
      </ScrollView>

      <MediaPreviewModal
        item={mediaPreview}
        onClose={() => setMediaPreview(null)}
        onOpenLink={(url) => openExternalLink(url)}
      />

      {aboutOverlay}

      <KeyboardSafeModalFrame visible={pickerOpen} onRequestClose={() => setPickerOpen(false)} align="end" padding={0}>
            <Pressable
              onPress={() => {}}
              style={{
                width: "100%",
                height: "80%",
                maxHeight: "80%",
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              }}
            >
              <View style={{ alignItems: "center", paddingTop: 10 }}>
                <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Thêm thành viên</Text>
                  <Pressable onPress={() => setPickerOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" }}>
                    <Ionicons name="close" size={16} color="#111827" />
                  </Pressable>
                </View>
                <SearchBar value={pickerQ} onChange={setPickerQ} placeholder="Tìm bạn bè để thêm" />
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>{candidatesToAdd.length} người có thể thêm</Text>
              </View>

              <FlatList
                data={candidatesToAdd}
                keyExtractor={(x) => x.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 32 }}
                renderItem={({ item }) => (
                  <View style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <ContactRow item={item} onPress={() => router.push(`/contact/user/${item.id}`)} />
                    </View>
                    <Pressable
                      disabled={busyAdd}
                      onPress={() => addMember(item.id)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: busyAdd ? "#E5E7EB" : SKY,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="add" size={18} color="white" />
                    </Pressable>
                  </View>
                )}
                ItemSeparatorComponent={() => <Divider />}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 12 }}>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Không còn bạn bè nào để thêm.</Text>
                  </View>
                }
              />
            </Pressable>
      </KeyboardSafeModalFrame>
    </Screen>
  );
}
