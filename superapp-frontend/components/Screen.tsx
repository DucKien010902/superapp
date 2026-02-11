import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ViewProps & {
  children: React.ReactNode;
  top?: number;
  bottom?: number;
  contentStyle?: ViewProps["style"];
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

  // ✅ Nếu không nằm trong TabNavigator thì hook có thể throw -> bắt lỗi để fallback = 0
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }

  return (
    <View {...rest} style={[styles.shell, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + top,
            paddingBottom: insets.bottom + bottom + 56,
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
  shell: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, backgroundColor: "#fff" },
});
