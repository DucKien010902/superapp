import ConfirmDialog from "@/components/note/ConfirmDialog";
import TopBar from "@/components/note/TopBar";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Folder } from "@/lib/note/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function FolderManageScreen() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Folder | null>(null);

  const load = useCallback(() => setFolders(NoteRepo.listFolders()), []);

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
        title="Quản lý thư mục"
        subtitle={`${folders.length} thư mục`}
        onMenu={() => router.back()}
        onSearch={() => {}}
        rightExtra={
          <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn}>
            <Text style={styles.addText}>+ Mới</Text>
          </Pressable>
        }
      />

      {/* Create */}
      <Modal visible={createOpen} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setCreateOpen(false)}
        />
        <View style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tạo thư mục</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên thư mục..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              autoFocus
            />
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setCreateOpen(false)}
                style={[styles.btn, styles.ghost]}
              >
                <Text style={styles.btnText}>Huỷ</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const n = name.trim();
                  if (!n) return;
                  NoteRepo.createFolder(n);
                  setName("");
                  setCreateOpen(false);
                  load();
                }}
                style={[styles.btn, styles.ok]}
              >
                <Text style={styles.btnText}>Tạo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename */}
      <Modal visible={renameOpen} transparent animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setRenameOpen(false)}
        />
        <View style={styles.modalCenter}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Đổi tên thư mục</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên mới..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
              autoFocus
            />
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setRenameOpen(false)}
                style={[styles.btn, styles.ghost]}
              >
                <Text style={styles.btnText}>Huỷ</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!selected) return;
                  const n = name.trim();
                  if (!n) return;
                  NoteRepo.renameFolder(selected.id, n);
                  setRenameOpen(false);
                  setSelected(null);
                  setName("");
                  load();
                }}
                style={[styles.btn, styles.ok]}
              >
                <Text style={styles.btnText}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        open={delOpen}
        title="Xoá thư mục?"
        desc="Ghi chú trong thư mục sẽ chuyển về 'không thư mục'."
        okText="Xoá"
        danger
        onCancel={() => setDelOpen(false)}
        onOk={() => {
          if (!selected) return;
          NoteRepo.deleteFolder(selected.id);
          setDelOpen(false);
          setSelected(null);
          load();
        }}
      />

      <View style={styles.list}>
        {folders.map((f) => (
          <View key={f.id} style={styles.row}>
            <Text style={styles.name}>{f.name}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  setSelected(f);
                  setName(f.name);
                  setRenameOpen(true);
                }}
                style={[styles.smallBtn, styles.ghost]}
              >
                <Text style={styles.smallText}>Đổi tên</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelected(f);
                  setDelOpen(true);
                }}
                style={[styles.smallBtn, styles.danger]}
              >
                <Text style={styles.smallText}>Xoá</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScreenNote>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070A12" },
  addBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  addText: { color: "rgba(255,255,255,0.9)", fontWeight: "900" },

  list: { padding: 16, gap: 12 },
  row: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  name: { color: "white", fontWeight: "900", fontSize: 15 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  ghost: { backgroundColor: "rgba(255,255,255,0.08)" },
  danger: { backgroundColor: "#DC2626" },
  smallText: { color: "white", fontWeight: "900" },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  input: {
    marginTop: 12,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: "white",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  ok: { backgroundColor: "#2563EB" },
  btnText: { color: "white", fontWeight: "900" },
});
