import type { Group } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export default function GroupRow({
  item,
  memberCount,
  onPress,
  onOpenTree,
  onDelete,
}: {
  item: Group;
  memberCount: number;
  onPress?: () => void;
  onOpenTree?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 18,
          backgroundColor: "#EEF2FF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name="people" size={18} color="#3730A3" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
          {item.name}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
          {memberCount} thành viên
        </Text>
      </View>

      {onDelete ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          hitSlop={10}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#FCA5A5",
            backgroundColor: "#FEE2E2",
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#B91C1C" />
        </Pressable>
      ) : onOpenTree ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onOpenTree();
          }}
          hitSlop={10}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: "#F3F4F6",
          }}
        >
          <Ionicons name="eye-outline" size={18} color="#111827" />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      )}
    </Pressable>
  );
}
