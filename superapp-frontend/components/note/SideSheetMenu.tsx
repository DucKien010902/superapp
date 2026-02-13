import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Item({
  label,
  onPress,
  badge,
}: {
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Text style={styles.itemText}>{label}</Text>
      {typeof badge === "number" ? (
        <Text style={styles.badge}>{badge}</Text>
      ) : null}
    </Pressable>
  );
}

export default function SideSheetMenu({
  open,
  onClose,
  allCount,
  topOffset = 10, // ✅ để bằng styles.wrap paddingTop của TopBar
}: {
  open: boolean;
  onClose: () => void;
  allCount?: number;
  topOffset?: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const top = useMemo(() => insets.top + topOffset, [insets.top, topOffset]);

  // anim: 0 đóng, 1 mở
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, t]);

  // slide từ trái vào
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0], // ✅ có thể tăng -320 nếu muốn từ ngoài màn hình
  });

  const opacity = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const closeWithAnim = () => {
    Animated.timing(t, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  return (
    <Modal visible={open} transparent animationType="none">
      {/* backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnim} />
      </Animated.View>

      {/* sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            top,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.head}>
          <Text style={styles.headTitle}>Menu</Text>
          <Pressable onPress={closeWithAnim} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Item
          label="Tất cả ghi chú"
          badge={allCount}
          onPress={() => {
            closeWithAnim();
            router.push("/note/all");
          }}
        />
        <Item
          label="Ghi chú chia sẻ (BETA)"
          onPress={() => {
            closeWithAnim();
          }}
        />
        <Item
          label="Thùng rác"
          onPress={() => {
            closeWithAnim();
            router.push("/note/trash");
          }}
        />

        <View style={styles.sep} />

        <Item
          label="Thư mục"
          onPress={() => {
            closeWithAnim();
            router.push("/note");
          }}
        />
        <Item
          label="Quản lý thư mục"
          onPress={() => {
            closeWithAnim();
            router.push("/note/folder/manage");
          }}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#234384",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
  },
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
  sep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 12,
  },
});
