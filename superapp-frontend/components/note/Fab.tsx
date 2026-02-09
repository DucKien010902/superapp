import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function Fab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.fab}>
      <Text style={styles.pen}>✎</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 128,
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A3C",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  pen: { color: "white", fontSize: 22, fontWeight: "900" },
});
