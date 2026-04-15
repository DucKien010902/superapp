import { AuthProvider, useAuth } from "@/lib/auth";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthGate() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return; // ✅ chưa mount navigator thì đừng navigate
    if (loading) return;

    const first = segments[0];
    const isRoot = first == null;

    // ✅ cho phép login + register
    const isAuthRoute = first === "login" || first === "register";

    if (isRoot) {
      router.replace(token ? "/" : "/login");
      return;
    }

    if (!token && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (token && isAuthRoute) {
      router.replace("/");
      return;
    }
  }, [navState?.key, token, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: "#050810" },
            }}
          />
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
