import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppIconTile from "@/components/AppIconTile";
import FolderCard from "@/components/FolderCard";

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === "android"}
      />

      {/* ✅ Nền gradient */}
      <LinearGradient
        colors={["#F8FBFF", "#EAF3FF", "#CFE3FF", "#86B8FF", "#2563EB"]}
        locations={[0, 0.35, 0.6, 0.82, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.75)", "transparent", "rgba(15,23,42,0.18)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ✅ Canh giữa toàn bộ cụm */}
      <View style={styles.centerWrap}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandText}>Super App</Text>
          <Text style={styles.subtitle}>Chọn nhanh ứng dụng bạn cần</Text>
        </View>

        {/* Card + 2 app */}
        <View style={styles.cardWrap}>
          <FolderCard title="Ứng dụng">
            <View style={styles.grid2}>
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
            </View>
          </FolderCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ✅ Cụm nằm giữa màn hình
  centerWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 16,

    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    marginBottom: 14,
  },

  brandText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#26538e",
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(15,23,42,0.70)",
    textAlign: "center",
  },

  cardWrap: {
    width: "100%",
    maxWidth: 460, // ✅ đẹp hơn trên tablet/desktop
    marginTop: 6,
  },

  grid2: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  hint: {
    marginTop: 14,
    textAlign: "center",
    color: "rgba(15,23,42,0.55)",
    fontSize: 12,
    lineHeight: 16,
  },
});
