import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: "violet" | "blue" | "green" | "orange"| "sky";
  logoUri?: string;
};

export default function AppIconTile({
  label,
  icon,
  onPress,
  tone = "blue",
  logoUri,
}: Props) {
  const toneStyle = TONE[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[styles.icon, toneStyle]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <Ionicons name={icon} size={28} color="white" />
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const TONE = StyleSheet.create({
  violet: {
    backgroundColor: "rgba(124, 92, 255, 1)",
    borderColor: "rgba(124, 92, 255, 0.35)",
  },
  sky: {
    backgroundColor: "rgb(22, 167, 203)",
    borderColor: "rgba(124, 92, 255, 0.35)",
  },
  blue: {
    backgroundColor: "rgba(59, 130, 246, 1)",
    borderColor: "rgba(59, 130, 246, 0.32)",
  },
  green: {
    backgroundColor: "rgba(16, 185, 129, 1)",
    borderColor: "rgba(16, 185, 129, 0.32)",
  },
  orange: {
    backgroundColor: "rgba(249, 115, 22, 1)",
    borderColor: "rgba(249, 115, 22, 0.32)",
  },
});

const styles = StyleSheet.create({
  wrap: { width: 92, alignItems: "center", gap: 8 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.95 },
  icon: {
    height: 64,
    width: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  label: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "700" },
});
