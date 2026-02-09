import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function ConfirmDialog({
  open,
  title,
  desc,
  okText = "OK",
  cancelText = "Huỷ",
  onOk,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  desc?: string;
  okText?: string;
  cancelText?: string;
  onOk: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal visible={open} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {desc ? <Text style={styles.desc}>{desc}</Text> : null}
          <View style={styles.row}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnText}>{cancelText}</Text>
            </Pressable>
            <Pressable onPress={onOk} style={[styles.btn, danger ? styles.btnDanger : styles.btnOk]}>
              <Text style={styles.btnText}>{okText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  title: { color: "white", fontSize: 16, fontWeight: "900" },
  desc: { marginTop: 8, color: "rgba(255,255,255,0.70)", lineHeight: 18 },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  btnOk: { backgroundColor: "#2563EB" },
  btnDanger: { backgroundColor: "#DC2626" },
  btnText: { color: "white", fontWeight: "900" },
});
