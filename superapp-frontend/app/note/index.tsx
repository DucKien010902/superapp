  import EmptyState from "@/components/note/EmptyState";
import Fab from "@/components/note/Fab";
import FolderCard from "@/components/note/FolderCard";
import NoteCard from "@/components/note/NoteCard";
import SideSheetMenu from "@/components/note/SideSheetMenu";
import SortPicker from "@/components/note/SortPicker";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Folder, Note, SortKey } from "@/lib/note/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

  export default function NoteFoldersHome() {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [sort, setSort] = useState<SortKey>("updated_desc");

    const [folders, setFolders] = useState<Folder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const allCount = useMemo(() => NoteRepo.countAllNotes(), [notes.length]);

    const load = useCallback(() => {
      setFolders(NoteRepo.listFolders());
      // Trang thư mục: show notes gần đây (all)
      setNotes(NoteRepo.listNotes({ sort }));
    }, [sort]);

    useFocusEffect(
      useCallback(() => {
        load();
      }, [load])
    );

    const folderCounts = useMemo(() => {
      const map = new Map<string, number>();
      const all = NoteRepo.listNotes({ sort: "updated_desc" });
      for (const n of all) {
        if (!n.folderId) continue;
        map.set(n.folderId, (map.get(n.folderId) ?? 0) + 1);
      }
      return map;
    }, [notes.length]);

    return (
      <ScreenNote style={styles.screen} contentStyle={{ backgroundColor: "#070A12" }}>

        <TopBar
          title="Thư mục"
          subtitle={`${folders.length} thư mục, ${allCount} ghi chú`}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => router.push("/note/search")}
          rightExtra={
            <View>
              {/* sort icon */}
              <View style={{ width: 10 }} />
            </View>
          }
        />

        <SideSheetMenu open={menuOpen} onClose={() => setMenuOpen(false)} allCount={allCount} />
        <SortPicker open={sortOpen} value={sort} onClose={() => setSortOpen(false)} onChange={setSort} />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Grid folders */}
          <View style={styles.grid2}>
            {folders.map((f) => (
              <View key={f.id} style={styles.cell2}>
                <FolderCard
                  name={f.name}
                  count={folderCounts.get(f.id) ?? 0}
                  onPress={() => router.push(`/note/folder/${f.id}`)}
                />
              </View>
            ))}
          </View>

          {/* Notes preview grid */}
          {notes.length === 0 ? (
            <EmptyState title="Chưa có ghi chú" desc="Nhấn nút ✎ để tạo ghi chú đầu tiên." />
          ) : (
            <View style={[styles.grid2, { marginTop: 14 }]}>
              {notes.slice(0, 12).map((n) => (
                <View key={n.id} style={styles.cell2}>
                  <NoteCard note={n} onPress={() => router.push(`/note/note/${n.id}`)} />
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
  });
