import ConfirmDialog from "@/components/note/ConfirmDialog";
import EmptyState from "@/components/note/EmptyState";
import Fab from "@/components/note/Fab";
import NoteCard from "@/components/note/NoteCard";
import SortPicker from "@/components/note/SortPicker";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note, SortKey } from "@/lib/note/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function FolderNotesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = String(id);

  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [items, setItems] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [confirmTrash, setConfirmTrash] = useState(false);

  const folder = useMemo(() => NoteRepo.getFolder(folderId), [folderId]);

  const load = useCallback(() => {
    setItems(NoteRepo.listNotes({ folderId, sort }));
  }, [folderId, sort]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenNote style={styles.screen} contentStyle={{ backgroundColor: "#070A12" }}>
      <TopBar
        title={folder?.name ?? "Thư mục"}
        subtitle={`${items.length} ghi chú`}
        onMenu={() => router.back()}
        onSearch={() => router.push("/note/search")}
        rightExtra={
          <Pressable onPress={() => setSortOpen(true)} style={styles.sortBtn}>
            <Text style={styles.sortText}>Sắp xếp</Text>
          </Pressable>
        }
      />

      <SortPicker open={sortOpen} value={sort} onClose={() => setSortOpen(false)} onChange={setSort} />

      <ConfirmDialog
        open={confirmTrash}
        title="Chuyển vào thùng rác?"
        desc="Bạn có thể khôi phục lại trong Thùng rác."
        okText="Chuyển"
        onCancel={() => setConfirmTrash(false)}
        onOk={() => {
          if (selected) {
            NoteRepo.moveToTrash(selected.id);
            setSelected(null);
            setConfirmTrash(false);
            load();
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <EmptyState title="Chưa có ghi chú" desc="Nhấn ✎ để tạo ghi chú trong thư mục này." />
        ) : (
          <View style={styles.grid2}>
            {items.map((n) => (
              <View key={n.id} style={styles.cell2}>
                <NoteCard
                  note={n}
                  onPress={() => router.push(`/note/note/${n.id}`)}
                  onLongPress={() => setSelected(n)}
                />

                {selected?.id === n.id ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => {
                        NoteRepo.togglePin(n.id);
                        setSelected(null);
                        load();
                      }}
                      style={[styles.actionBtn, styles.ok]}
                    >
                      <Text style={styles.actionText}>{n.pinned ? "Bỏ ghim" : "Ghim"}</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmTrash(true)} style={[styles.actionBtn, styles.danger]}>
                      <Text style={styles.actionText}>Xoá</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelected(null)} style={[styles.actionBtn, styles.ghost]}>
                      <Text style={styles.actionText}>Đóng</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => router.push({ pathname: "/note/note/create", params: { folderId } } as any)} />
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

  actions: { gap: 8, marginTop: 8 },
  actionBtn: { paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  ok: { backgroundColor: "#2563EB" },
  danger: { backgroundColor: "#DC2626" },
  ghost: { backgroundColor: "rgba(255,255,255,0.08)" },
  actionText: { color: "white", fontWeight: "900" },
});
