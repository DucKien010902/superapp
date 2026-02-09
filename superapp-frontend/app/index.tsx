import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import AppIconTile from "@/components/AppIconTile";
import FolderCard from "@/components/FolderCard";
import Screen from "@/components/Screen";

export default function Home() {
  const router = useRouter();

  return (
    <Screen style={{ backgroundColor: "#070A12" }} contentStyle={{ backgroundColor: "#070A12" }}>
      {/* nền gradient nhiều lớp cho có chiều sâu */}
      <LinearGradient
        colors={["#050810", "#0B1230", "#160A22"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={["rgba(124,92,255,0.22)", "transparent", "rgba(59,130,246,0.18)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.container}>
        {/* Title căn giữa và “hạ xuống” */}
        <Text style={styles.bigTitle}>Super App</Text>

        {/* Card folder căn giữa */}
        <View style={styles.folderWrap}>
          <FolderCard title="Thư mục">
            <AppIconTile
              label="Note"
              icon="document-text-outline"
              tone="violet"
              onPress={() => router.push("/note/" as any)}
            />
            <AppIconTile
              label="Contact"
              icon="people-outline"
              tone="blue"
              onPress={() => router.push("/contact/" as any)}
            />
          </FolderCard>
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050810" },

  container: {
    flex: 1,
    paddingHorizontal: 18,
    // ✅ đẩy cụm nội dung xuống và căn giữa
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
    gap: 14,
  },

  bigTitle: {
    textAlign: "center",
    fontSize: 42,
    fontWeight: "900",
    color: "rgb(203, 176, 41)",
    letterSpacing: 0.2,
    marginBottom: 6,
  },

  folderWrap: {
    width: "100%",
    maxWidth: 420,
  },

  hint: {
    marginTop: 8,
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    maxWidth: 420,
    lineHeight: 16,
  },
});
