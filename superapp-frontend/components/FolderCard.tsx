import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function FolderCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <BlurView intensity={35} tint="dark" style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.grid}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    overflow: "hidden",
  },
  card: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    minHeight: 300,
    borderColor: "rgba(255,255,255,0.10)",
  },
  title: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 14,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    gap: 18,
    flexWrap: "wrap",
  },
});
