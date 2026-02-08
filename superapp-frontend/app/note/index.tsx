import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
  );
}

export default function NoteHome() {
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Ghi chú</Text>
      <Text style={styles.p}>Trang chủ Note (demo UI). Sau này bạn build list note, search, tag ở đây.</Text>

      <View style={styles.row}>
        <Card title="Quick Note" desc="Tạo ghi chú nhanh chỉ 1 chạm." />
        <Card title="Tags" desc="Gắn thẻ, lọc theo nhóm." />
      </View>

      <Card title="Recent" desc="Hiển thị ghi chú gần đây (sẽ nối API sau)." />
      <Card title="Pinned" desc="Ghim ghi chú quan trọng lên đầu." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#070A12" },
  container: { padding: 16, gap: 12 },
  h1: { color: "white", fontSize: 26, fontWeight: "900" },
  p: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 18 },

  row: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardTitle: { color: "white", fontSize: 15, fontWeight: "800" },
  cardDesc: { color: "rgba(255,255,255,0.68)", fontSize: 12, marginTop: 6, lineHeight: 16 },
});
