import ConfirmDialog from "@/components/note/ConfirmDialog";
import EmptyState from "@/components/note/EmptyState";
import NoteCard from "@/components/note/NoteCard";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note } from "@/lib/note/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function TrashScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Note[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => setItems(NoteRepo.listTrash()), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const isSelectMode = selectedCount > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // dọn key false để state gọn
      if (!next[id]) delete next[id];
      return next;
    });
  };

  const clearSelection = () => setSelectedIds({});

  const selectedList = useMemo(
    () => Object.keys(selectedIds).filter((k) => selectedIds[k]),
    [selectedIds]
  );

  const deleteSelected = () => {
    if (!selectedList.length) return;
    NoteRepo.deleteForeverMany(selectedList);
    setConfirmDelete(false);
    clearSelection();
    load();
  };

  const restoreSelected = () => {
    if (!selectedList.length) return;
    selectedList.forEach((id) => NoteRepo.restoreFromTrash(id));
    clearSelection();
    load();
  };

  return (
    <ScreenNote style={styles.screen} contentStyle={{ backgroundColor: "#070A12" }}>
      <TopBar
        title={isSelectMode ? `Đã chọn ${selectedCount}` : "Thùng rác"}
        subtitle={isSelectMode ? "Chọn để xoá vĩnh viễn / khôi phục" : `${items.length} mục`}
        onMenu={() => (isSelectMode ? clearSelection() : router.back())}
        onSearch={() => {}}
        rightExtra={
          <View style={{ flexDirection: "row", gap: 10 }}>
            {isSelectMode ? (
              <>
                <Pressable onPress={restoreSelected} style={[styles.iconBtn, styles.okBtn]}>
                  <Text style={styles.iconText}>↩</Text>
                </Pressable>

                <Pressable onPress={() => setConfirmDelete(true)} style={[styles.iconBtn, styles.dangerBtn]}>
                  <Text style={styles.iconText}>🗑</Text>
                </Pressable>

                <Pressable onPress={clearSelection} style={styles.iconBtn}>
                  <Text style={styles.iconText}>✕</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                <Text style={styles.iconText}>←</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Xoá vĩnh viễn?"
        desc={`Bạn sắp xoá vĩnh viễn ${selectedCount} mục. Hành động này không thể hoàn tác.`}
        okText="Xoá"
        danger
        onCancel={() => setConfirmDelete(false)}
        onOk={deleteSelected}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <EmptyState title="Thùng rác trống" desc="Các ghi chú đã xoá sẽ nằm ở đây." />
        ) : (
          <View style={styles.grid2}>
            {items.map((n) => {
              const checked = !!selectedIds[n.id];

              return (
                <View key={n.id} style={styles.cell2}>
                  <View style={styles.cardWrap}>
                    <NoteCard
                      note={n}
                      onPress={() => {
                        if (isSelectMode) toggleSelect(n.id);
                        else router.push(`/note/note/${n.id}`);
                      }}
                      onLongPress={() => toggleSelect(n.id)}
                    />

                    {/* overlay tick */}
                    <Pressable
                      onPress={() => toggleSelect(n.id)}
                      style={[styles.check, checked ? styles.checkOn : styles.checkOff]}
                    >
                      <Text style={styles.checkText}>{checked ? "✓" : ""}</Text>
                    </Pressable>
                  </View>

                  {/* actions cho 1 item (tuỳ thích): khi chưa chọn mode thì vẫn cho thao tác nhanh */}
                  {!isSelectMode ? (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => {
                          NoteRepo.restoreFromTrash(n.id);
                          load();
                        }}
                        style={[styles.actionBtn, styles.ok]}
                      >
                        <Text style={styles.actionText}>Khôi phục</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setSelectedIds({ [n.id]: true });
                          setConfirmDelete(true);
                        }}
                        style={[styles.actionBtn, styles.danger]}
                      >
                        <Text style={styles.actionText}>Xoá vĩnh viễn</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
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

  iconBtn: {
    height: 40,
    width: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  iconText: { color: "white", fontSize: 16, fontWeight: "900" },
  okBtn: { backgroundColor: "rgba(22,163,74,0.25)", borderColor: "rgba(22,163,74,0.35)" },
  dangerBtn: { backgroundColor: "rgba(220,38,38,0.25)", borderColor: "rgba(220,38,38,0.35)" },

  cardWrap: { position: "relative" },
  check: {
    position: "absolute",
    right: 10,
    top: 10,
    height: 28,
    width: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkOff: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  checkOn: {
    backgroundColor: "rgba(22,163,74,0.85)",
    borderColor: "rgba(22,163,74,1)",
  },
  checkText: { color: "white", fontWeight: "900", fontSize: 14 },

  actions: { gap: 8, marginTop: 8 },
  actionBtn: { paddingVertical: 10, borderRadius: 14, alignItems: "center" },
  ok: { backgroundColor: "#16A34A" },
  danger: { backgroundColor: "#DC2626" },
  actionText: { color: "white", fontWeight: "900" },
});
