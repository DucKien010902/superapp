import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function FolderCard({
  name,
  count,
  onPress,
}: {
  name: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.folderTop}>
        <Text style={styles.count}>{count}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  folderTop: { flexDirection: "row", justifyContent: "space-between" },
  count: { color: "rgba(255,255,255,0.55)", fontWeight: "900" },
  name: { marginTop: 10, color: "white", fontSize: 14, fontWeight: "800" },
});
