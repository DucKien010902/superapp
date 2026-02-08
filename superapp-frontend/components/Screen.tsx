import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
  children: React.ReactNode;
  top?: number;
  bottom?: number;
  contentStyle?: ViewProps["style"]; // style cho phần nội dung
};

export default function Screen({
  children,
  style,
  contentStyle,
  top = 0,
  bottom = 0,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View {...rest} style={[styles.shell, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + top,
            paddingBottom: insets.bottom + bottom,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#000" },     // ✅ safe-area nền đen
  content: { flex: 1, backgroundColor: "#fff" },   // ✅ nội dung nền trắng
});
