import type { Group } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { Image, Linking, Modal, Pressable, Text, View } from "react-native";

const SKY_DARK = "#0369A1";
const SKY_SOFT = "#E0F2FE";
const SKY_BORDER = "#7DD3FC";

export type MediaPreview = {
  kind: "image" | "file";
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  createdAt?: string;
};

export function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />;
}

export function TabPill({
  active,
  label,
  icon,
  onPress,
  stretch,
}: {
  active: boolean;
  label: string;
  icon: any;
  onPress: () => void;
  stretch?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: stretch === false ? undefined : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: stretch === false ? 10 : 6,
        borderRadius: 999,
        backgroundColor: active ? "#0284C7" : "transparent",
      }}
    >
      <Ionicons name={icon} size={16} color={active ? "white" : "#6B7280"} />
      <Text style={{ fontSize: 12, fontWeight: "900", color: active ? "white" : "#6B7280" }}>
        {label}
      </Text>
    </Pressable>
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

export function GroupHeaderCard({
  group,
  memberCount,
  onOpenTree,
}: {
  group: Group;
  memberCount: number;
  onOpenTree: () => void;
}) {
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
              {memberCount} thành viên • {group.childCount || 0} nhóm con
            </Text>
          </View>
          <Pressable
            onPress={onOpenTree}
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              backgroundColor: "rgba(2,132,199,0.12)",
              borderWidth: 1,
              borderColor: "rgba(2,132,199,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="eye-outline" size={21} color={SKY_DARK} />
          </Pressable>
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

function formatDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

function formatBytes(size?: number) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

export function imageAssetName(uri: string, index = 0) {
  return uri.split("/").pop() || `image_${Date.now()}_${index}.jpg`;
}

export function imageMimeType(name: string) {
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export async function openExternalLink(url?: string) {
  const finalUrl = String(url || "").trim();
  if (!finalUrl) return;
  const ok = await Linking.canOpenURL(finalUrl);
  if (!ok) return;
  Linking.openURL(finalUrl);
}

export function GroupMediaPreviewModal({
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
              </View>
            </Card>
          </View>
        )}
      </View>
    </Modal>
  );
}

export function GroupImagesPanel({
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
          <Pressable onPress={onUpload} disabled={uploading} style={{ width: "31%", aspectRatio: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: SKY_BORDER, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center", opacity: uploading ? 0.7 : 1 }}>
            <Ionicons name={uploading ? "cloud-upload-outline" : "add"} size={28} color={SKY_DARK} />
            <Text style={{ marginTop: 6, fontSize: 12, fontWeight: "800", color: SKY_DARK }}>{uploading ? "Đang tải" : "Thêm"}</Text>
          </Pressable>
        ) : null}
        {items.length === 0 ? <Card><View style={{ padding: 12, width: "100%" }}><Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có ảnh nào.</Text></View></Card> : null}
        {items.map((item, idx) => (
          <Pressable key={item.id || `${item.url}-${idx}`} onPress={() => onPreview({ kind: "image", url: item.url, name: item.caption || "Ảnh nhóm" })} style={{ width: "31%", aspectRatio: 1, borderRadius: 18, overflow: "hidden", backgroundColor: "#E5E7EB" }}>
            <Image source={{ uri: item.url }} style={{ width: "100%", height: "100%" }} />
            {canManage && item.id ? (
              <Pressable onPress={() => onDelete(item.id)} style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(17,24,39,0.72)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={15} color="white" />
              </Pressable>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function GroupFilesPanel({
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
            <Pressable onPress={onUpload} disabled={uploading} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F8FBFF", opacity: uploading ? 0.7 : 1 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: SKY_SOFT, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={uploading ? "cloud-upload-outline" : "add"} size={22} color={SKY_DARK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{uploading ? "Đang upload..." : "Thêm file"}</Text>
                <Text style={{ marginTop: 2, color: "#6B7280", fontSize: 12 }}>Chọn một hoặc nhiều file để lưu vào MinIO</Text>
              </View>
            </Pressable>
            <Divider />
          </>
        ) : null}
        {items.length === 0 ? <View style={{ padding: 12 }}><Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có tài liệu nào.</Text></View> : null}
        {items.map((file, idx) => (
          <View key={file.id || `${file.url}-${idx}`}>
            <Pressable onPress={() => onPreview({ kind: String(file.mimeType || "").startsWith("image/") ? "image" : "file", url: file.url, name: file.name || "Untitled", mimeType: file.mimeType, size: file.size, createdAt: file.createdAt })} style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={fileIcon(file.name, file.mimeType)} size={20} color="#111827" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{file.name || "Untitled"}</Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>{`${formatBytes(file.size)} • ${formatDate(file.createdAt)}`}</Text>
              </View>
              {canManage && file.id ? (
                <Pressable onPress={() => onDelete(file.id)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                </Pressable>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
            {idx !== items.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}
