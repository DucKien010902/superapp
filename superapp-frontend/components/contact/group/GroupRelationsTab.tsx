import type { GroupRelationshipTreeSummary } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";

const card = {
  backgroundColor: "white",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  overflow: "hidden",
} as const;

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />;
}

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

export default function GroupRelationsTab({
  items,
  loading,
  onOpenTree,
  onOpenCreate,
  onRename,
  onDelete,
}: {
  items: GroupRelationshipTreeSummary[];
  loading: boolean;
  onOpenTree: (item: GroupRelationshipTreeSummary) => void;
  onOpenCreate: () => void;
  onRename: (item: GroupRelationshipTreeSummary) => void;
  onDelete: (item: GroupRelationshipTreeSummary) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={card}>
        <View style={{ padding: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>Sơ đồ quan hệ</Text>
            <Pressable
              onPress={onOpenCreate}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: SKY,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={20} color="white" />
            </Pressable>
          </View>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
            Mỗi sơ đồ chỉ dùng user đang có trong nhóm này.
          </Text>
        </View>
        <Divider />
        <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
          {loading ? (
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Đang tải sơ đồ...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có sơ đồ quan hệ nào.</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => onOpenTree(item)}
                  style={{ paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="git-network-outline" size={20} color={SKY_DARK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#111827" }}>{item.name}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>
                      {item.nodeCount} node • cập nhật {formatDate(item.updatedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      onRename(item);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "#F3F4F6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color="#111827" />
                  </Pressable>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      onDelete(item);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "#FEE2E2",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  </Pressable>
                </Pressable>
                {index !== items.length - 1 ? <Divider /> : null}
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}
