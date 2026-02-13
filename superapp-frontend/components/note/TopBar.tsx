import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function TopBar({
  title,
  subtitle,
  onMenu,
  onSearch,
  rightExtra,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  onSearch?: () => void;
  rightExtra?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onMenu} style={styles.iconBtn} hitSlop={10}>
          <Text style={styles.icon}>≡</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>

        {rightExtra}

        <Pressable onPress={onSearch} style={styles.iconBtn} hitSlop={10}>
          <Text style={styles.icon}>⌕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: "white", fontSize: 24, fontWeight: "900" },
  sub: { marginTop: 4, color: "rgba(255,255,255,0.65)", fontSize: 13 },
  iconBtn: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  icon: { color: "white", fontSize: 30, fontWeight: "900" },
});
