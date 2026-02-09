import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {desc ? <Text style={styles.desc}>{desc}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginTop: 10,
  },
  title: { color: "white", fontSize: 14, fontWeight: "900" },
  desc: { marginTop: 6, color: "rgba(255,255,255,0.65)", lineHeight: 18 },
});
