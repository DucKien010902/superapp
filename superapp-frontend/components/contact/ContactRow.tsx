import type { Friend } from "@/lib/contact/types";
import { Image, Pressable, Text, View } from "react-native";

const SKY = "#0284C7";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function ContactRow({
  item,
  onPress,
}: {
  item: Friend;
  onPress?: () => void;
}) {
  const hasAvatar = !!item.avatar && item.avatar.trim().length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 18,
          backgroundColor: SKY,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          overflow: "hidden", // ✅ để ảnh bo góc
          position: "relative",
        }}
      >
        {hasAvatar ? (
          <Image
            source={{ uri: item.avatar }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
            {initials(item.name)}
          </Text>
        )}

        {/* online dot */}
        {item.isOnline ? (
          <View
            style={{
              position: "absolute",
              right: 2,
              bottom: 2,
              width: 12,
              height: 12,
              borderRadius: 999,
              backgroundColor: "#22C55E",
              borderWidth: 2,
              borderColor: "white",
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
          {item.name}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
          {item.phone ?? "—"}
        </Text>
      </View>
    </Pressable>
  );
}
