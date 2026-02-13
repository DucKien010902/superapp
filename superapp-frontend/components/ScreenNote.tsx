import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ dùng được khi screen nằm trong Tabs
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

type Props = ViewProps & {
  children: React.ReactNode;
  top?: number;
  bottom?: number;
  contentStyle?: ViewProps["style"];
};

export default function ScreenNote({
  children,
  style,
  contentStyle,
  top = 0,
  bottom = 0,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();

  // ✅ nếu không nằm trong Tabs thì hook này có thể lỗi → bọc try/catch
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {}

  return (
    <View {...rest} style={[styles.shell, style]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + top + 40,
            // ✅ chừa safe-area + extra bottom + chiều cao tab bar
            paddingBottom: insets.bottom + bottom + tabBarHeight,
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
  shell: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, backgroundColor: "#fff" },
});
