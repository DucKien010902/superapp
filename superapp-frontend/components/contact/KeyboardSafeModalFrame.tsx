import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  align?: "center" | "end";
  padding?: number;
  backdropColor?: string;
  keyboardGap?: number;
  style?: ViewStyle;
};

export default function KeyboardSafeModalFrame({
  visible,
  onRequestClose,
  children,
  align = "center",
  padding = 16,
  backdropColor = "rgba(0,0,0,0.45)",
  keyboardGap = 12,
  style,
}: Props) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onRequestClose();
      return true;
    });

    return () => sub.remove();
  }, [onRequestClose, visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const keyboardOpen = keyboardHeight > 0;
  const bottomInset = keyboardOpen ? keyboardHeight + keyboardGap : padding;
  const justifyContent = align === "end" ? "flex-end" : "center";

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1000,
        elevation: 1000,
      }}
    >
      <Pressable
        onPress={onRequestClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: backdropColor,
        }}
      />
      <View
        pointerEvents="box-none"
        style={[
            {
              position: "absolute",
              top: padding,
              right: padding,
              bottom: bottomInset,
              left: padding,
              alignItems: "center",
              justifyContent,
            },
          style,
        ]}
      >
        <View
          pointerEvents="box-none"
          style={{ width: "100%", height: "100%", alignItems: "center", justifyContent }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
