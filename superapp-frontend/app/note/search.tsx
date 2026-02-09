import EmptyState from "@/components/note/EmptyState";
import NoteCard from "@/components/note/NoteCard";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note } from "@/lib/note/types";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function NoteSearchScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Note[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      const s = q.trim();
      if (!s) {
        setItems([]);
        return;
      }
      setItems(NoteRepo.search(s));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const header = useMemo(() => {
    if (!q.trim()) return "Nhập từ khoá để tìm...";
    return `${items.length} kết quả`;
  }, [q, items.length]);

  return (
    <ScreenNote style={styles.screen} contentStyle={{ backgroundColor: "#070A12" }}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm ghi chú..."
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.input}
          autoFocus
        />
      </View>

      <Text style={styles.meta}>{header}</Text>

      <View style={styles.content}>
        {!q.trim() ? (
          <EmptyState title="Tìm kiếm" desc="Bạn có thể tìm theo tiêu đề hoặc nội dung." />
        ) : items.length === 0 ? (
          <EmptyState title="Không có kết quả" desc="Thử từ khoá khác nhé." />
        ) : (
          <View style={styles.grid2}>
            {items.map((n) => (
              <View key={n.id} style={styles.cell2}>
                <NoteCard note={n} onPress={() => router.push(`/note/note/${n.id}`)} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenNote>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070A12", paddingTop: 10 },
  top: { flexDirection: "row", gap: 10, paddingHorizontal: 16, alignItems: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  backText: { color: "white", fontSize: 18, fontWeight: "900" },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: "white",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  meta: { paddingHorizontal: 16, paddingTop: 10, color: "rgba(255,255,255,0.65)", fontWeight: "800" },
  content: { flex: 1, padding: 16 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell2: { width: "48%" },
});
