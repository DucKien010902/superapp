import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ContactTabsLayout() {
  const insets = useSafeAreaInsets();

  const baseHeight = 56;
  const topPad = 8;
  const bottomInset = Math.max(insets.bottom, 10);

  const tabWhite = "white";
  const bottomBlack = "#000000";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1340a1",
        tabBarInactiveTintColor: "#6B7280",
        tabBarBackground: () => (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: tabWhite }} />
            <View style={{ height: bottomInset, backgroundColor: bottomBlack }} />
          </View>
        ),
        tabBarStyle: {
          height: baseHeight + topPad + bottomInset,
          paddingTop: topPad,
          paddingBottom: bottomInset,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >

      {/* ✅ đổi contacts -> index (tab danh bạ) */}
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Liên hệ",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
            name={focused ? "person" : "person-outline"}
            size={size}
            color={color}
            />
          ),
        }}
      />
<Tabs.Screen
  name="groups"
  options={{
    title: "Nhóm",
    tabBarIcon: ({ color, size, focused }) => (
      <Ionicons
        name={focused ? "people" : "people-outline"}
        size={size}
        color={color}
      />
    ),
  }}
/>

      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ✅ hidden routes: để options={{ href: null }} OK, nhưng phải đúng tên file */}
      <Tabs.Screen name="group/[id]" options={{ href: null }} />
      <Tabs.Screen name="user/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[conversationId]" options={{ href: null }} />
      <Tabs.Screen name="chat/group" options={{ href: null }} />
    </Tabs>
  );
}
