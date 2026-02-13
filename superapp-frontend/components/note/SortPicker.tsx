import type { SortKey } from "@/lib/note/types";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const ITEMS: Array<{ key: SortKey; label: string }> = [
  { key: "updated_desc", label: "Ngày sửa đổi (mới → cũ)" },
  { key: "updated_asc", label: "Ngày sửa đổi (cũ → mới)" },
  { key: "title_asc", label: "Tiêu đề (A → Z)" },
  { key: "title_desc", label: "Tiêu đề (Z → A)" },
];

export default function SortPicker({
  open,
  value,
  onClose,
  onChange,
}: {
  open: boolean;
  value: SortKey;
  onClose: () => void;
  onChange: (v: SortKey) => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <Text style={styles.h}>Sắp xếp</Text>
          {ITEMS.map((it) => (
            <Pressable
              key={it.key}
              onPress={() => {
                onChange(it.key);
                onClose();
              }}
              style={[styles.item, value === it.key && styles.itemActive]}
            >
              <Text style={styles.itemText}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetWrap: { flex: 1, justifyContent: "flex-end", padding: 12 },
  sheet: {
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  h: { color: "white", fontSize: 16, fontWeight: "900", padding: 10 },
  item: { padding: 12, borderRadius: 16 },
  itemActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  itemText: { color: "rgba(255,255,255,0.85)", fontWeight: "800" },
});
