import EmptyState from "@/components/note/EmptyState";
import Fab from "@/components/note/Fab";
import NoteCard from "@/components/note/NoteCard";
import SideSheetMenu from "@/components/note/SideSheetMenu";
import SortPicker from "@/components/note/SortPicker";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note, SortKey } from "@/lib/note/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AllNotesScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [notes, setNotes] = useState<Note[]>([]);

  const load = useCallback(() => {
    setNotes(NoteRepo.listNotes({ sort }));
  }, [sort]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScreenNote
      style={styles.screen}
      contentStyle={{ backgroundColor: "#070A12" }}
    >
      <TopBar
        title="Tất cả ghi chú"
        subtitle={`${notes.length} ghi chú`}
        onMenu={() => setMenuOpen(true)}
        onSearch={() => router.push("/note/search")}
        rightExtra={
          <Pressable onPress={() => setSortOpen(true)} style={styles.sortBtn}>
            <Text style={styles.sortText}>Sắp xếp</Text>
          </Pressable>
        }
      />

      <SideSheetMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        // allCount={allCount}
        topOffset={90}
      />
      <SortPicker
        open={sortOpen}
        value={sort}
        onClose={() => setSortOpen(false)}
        onChange={setSort}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {notes.length === 0 ? (
          <EmptyState title="Chưa có ghi chú" desc="Nhấn ✎ để tạo ghi chú." />
        ) : (
          <View style={styles.grid2}>
            {notes.map((n) => (
              <View key={n.id} style={styles.cell2}>
                <NoteCard
                  note={n}
                  onPress={() => router.push(`/note/note/${n.id}`)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => router.push("/note/note/create")} />
    </ScreenNote>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070A12" },
  content: { padding: 16, paddingBottom: 100 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell2: { width: "48%" },
  sortBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sortText: { color: "rgba(255,255,255,0.9)", fontWeight: "900" },
});
