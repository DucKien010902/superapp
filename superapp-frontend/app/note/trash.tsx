import ConfirmDialog from "@/components/note/ConfirmDialog";
import EmptyState from "@/components/note/EmptyState";
import NoteCard from "@/components/note/NoteCard";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note } from "@/lib/note/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function TrashScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => setItems(NoteRepo.listTrash()), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenNote style={styles.screen} contentStyle={{ backgroundColor: "#070A12" }}>
      <TopBar
        title="Thùng rác"
        subtitle={`${items.length} mục`}
        onMenu={() => router.back()}
        onSearch={() => {}}
        rightExtra={
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá vĩnh viễn?"
        desc="Hành động này không thể hoàn tác."
        okText="Xoá"
        danger
        onCancel={() => setConfirmDelete(false)}
        onOk={() => {
          if (selected) {
            NoteRepo.deleteForever(selected.id);
            setConfirmDelete(false);
            setSelected(null);
            load();
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <EmptyState title="Thùng rác trống" desc="Các ghi chú đã xoá sẽ nằm ở đây." />
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
                        NoteRepo.restoreFromTrash(n.id);
                        setSelected(null);
                        load();
                      }}
                      style={[styles.actionBtn, styles.ok]}
                    >
                      <Text style={styles.actionText}>Khôi phục</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setConfirmDelete(true)}
                      style={[styles.actionBtn, styles.danger]}
                    >
                      <Text style={styles.actionText}>Xoá vĩnh viễn</Text>
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
    </ScreenNote>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070A12" },
  content: { padding: 16, paddingBottom: 80 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell2: { width: "48%" },

  backBtn: {
    height: 40,
    width: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  backText: { color: "white", fontSize: 18, fontWeight: "900" },

  actions: { gap: 8, marginTop: 8 },
  actionBtn: { paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  ok: { backgroundColor: "#16A34A" },
  danger: { backgroundColor: "#DC2626" },
  ghost: { backgroundColor: "rgba(255,255,255,0.08)" },
  actionText: { color: "white", fontWeight: "900" },
});
