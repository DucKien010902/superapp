import { useRouter } from "expo-router";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

function Item({ label, onPress, badge }: { label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Text style={styles.itemText}>{label}</Text>
      {typeof badge === "number" ? <Text style={styles.badge}>{badge}</Text> : null}
    </Pressable>
  );
}

export default function SideSheetMenu({
  open,
  onClose,
  allCount,
}: {
  open: boolean;
  onClose: () => void;
  allCount?: number;
}) {
  const router = useRouter();

  return (
    <Modal visible={open} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>Menu</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Item
          label="Tất cả ghi chú"
          badge={allCount}
          onPress={() => {
            onClose();
            router.push("/note/all");
          }}
        />
        <Item
          label="Ghi chú chia sẻ (BETA)"
          onPress={() => {
            onClose();
            // future
          }}
        />
        <Item
          label="Thùng rác"
          onPress={() => {
            onClose();
            router.push("/note/trash");
          }}
        />

        <View style={styles.sep} />

        <Item
          label="Thư mục"
          onPress={() => {
            onClose();
            router.push("/note");
          }}
        />
        <Item
          label="Quản lý thư mục"
          onPress={() => {
            onClose();
            router.push("/note/folder/manage");
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    left: 12,
    top: 60,
    right: 12,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 8 },
  headTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  close: { color: "rgba(255,255,255,0.8)", fontSize: 18, fontWeight: "900" },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemText: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "800" },
  badge: { color: "rgba(255,255,255,0.65)", fontWeight: "900" },
  sep: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 12 },
});
