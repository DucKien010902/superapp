import { AuthProvider, useAuth } from "@/lib/auth";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

function AuthGate() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const first = segments[0];
    const isRoot = first == null;       // ✅ thay vì segments.length === 0
    const isAuthRoute = first === "login";

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
  }, [token, loading, segments, router]);

  return null;
}


export default function RootLayout() {
  return (
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
  );
}
