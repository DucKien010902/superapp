import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export default function AppTile({ title, subtitle, icon, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color="#EAF2FF" />
      </View>

      <View style={styles.meta}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>

        <View style={styles.chip}>
          <Text style={styles.chipText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color="#BFD3FF" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    overflow: "hidden",
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },

  iconWrap: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "rgba(124, 92, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { marginTop: 10, gap: 6 },
  title: { color: "white", fontSize: 16, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 16 },

  chip: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  chipText: { color: "#BFD3FF", fontSize: 12, fontWeight: "700" },
});
