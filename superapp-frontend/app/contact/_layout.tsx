import { Ionicons } from "@expo/vector-icons";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ContactLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showDetailTabBar =
    pathname.startsWith("/contact/user/") ||
    pathname.startsWith("/contact/group/") ||
    pathname.startsWith("/contact/chat/");

  const bottomInset = Math.max(insets.bottom, 10);

  const tabs = [
    {
      key: "contacts",
      label: "Liên hệ",
      icon: "person-outline" as const,
      activeIcon: "person" as const,
      active:
        pathname.startsWith("/contact/contacts") ||
        pathname.startsWith("/contact/user/") ||
        pathname.startsWith("/contact/chat/"),
      onPress: () => router.replace("/contact/contacts"),
    },
    {
      key: "groups",
      label: "Nhóm",
      icon: "people-outline" as const,
      activeIcon: "people" as const,
      active:
        pathname.startsWith("/contact/groups") ||
        pathname.startsWith("/contact/group/") ||
        pathname.startsWith("/contact/chat/group"),
      onPress: () => router.replace("/contact/groups"),
    },
    {
      key: "profile",
      label: "Cá nhân",
      icon: "person-circle-outline" as const,
      activeIcon: "person-circle" as const,
      active: pathname.startsWith("/contact/profile"),
      onPress: () => router.replace("/contact/profile"),
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="chat/[conversationId]" />
        <Stack.Screen name="chat/group" />
      </Stack>

      {showDetailTabBar ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-around",
                backgroundColor: "white",
                paddingTop: 8,
                paddingBottom: 0,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              {tabs.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={tab.onPress}
                  style={{ minWidth: 72, alignItems: "center", paddingVertical: 4 }}
                >
                  <Ionicons
                    name={tab.active ? tab.activeIcon : tab.icon}
                    size={22}
                    color={tab.active ? "#1340a1" : "#6B7280"}
                  />
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      fontWeight: "600",
                      color: tab.active ? "#1340a1" : "#6B7280",
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: bottomInset, backgroundColor: "#000000" }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
