import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import AppIconTile from "@/components/AppIconTile";
import FolderCard from "@/components/FolderCard";
import { useAuth } from "@/lib/auth";
import { createNewVersion, fetchLatestVersion, markVersionAsViewed } from "@/lib/version/api"; // Import các hàm API vừa tạo

export default function Home() {
  const router = useRouter();
  const { user, token, refreshMe } = useAuth(); // Lấy user từ AuthContext
  
  const [latestVer, setLatestVer] = useState<any>(null);
  
  // State cho form của Admin
  const [newVersionCode, setNewVersionCode] = useState("");
  const [newDownloadUrl, setNewDownloadUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Nhận diện SĐT Admin (kiểm tra định dạng DB của bạn là 096... hay 8496...)
  const isAdminPhone = user?.phone?.includes("965731936") || user?.profile?.phone?.includes("965731936");

  useEffect(() => {
    if (token) {
      loadLatestVersion();
    }
  }, [token]);

  const loadLatestVersion = async () => {
    try {
      const ver = await fetchLatestVersion(token!);
      setLatestVer(ver);
    } catch (e) {
      console.log("Lỗi tải version:", e);
    }
  };

  // --- HÀM CỦA ADMIN: Đăng link mới ---
  const handlePublishVersion = async () => {
    if (!newVersionCode.trim() || !newDownloadUrl.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đủ Version và Link tải");
      return;
    }
    setIsPublishing(true);
    try {
      await createNewVersion(token!, { versionCode: newVersionCode, downloadUrl: newDownloadUrl });
      Alert.alert("Thành công", "Đã cập nhật phiên bản mới toàn hệ thống!");
      setNewVersionCode("");
      setNewDownloadUrl("");
      loadLatestVersion(); // Reload lại bản mới
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể đăng bản cập nhật");
    } finally {
      setIsPublishing(false);
    }
  };

  // --- HÀM CỦA USER: Bấm cập nhật ---
  const handleUpdate = async () => {
    if (!latestVer?.downloadUrl) return;
    
    // Mở link trên trình duyệt/chợ ứng dụng
    Linking.openURL(latestVer.downloadUrl);

    // Ghi nhận đã xem (nếu chưa ghi nhận)
    if (user?.lastViewedVersion !== latestVer.versionCode) {
      try {
        await markVersionAsViewed(token!, latestVer.versionCode);
        await refreshMe(); // Cập nhật lại user state để đổi màu nút ngay lập tức
      } catch (e) {
        console.log("Không thể lưu trạng thái viewed");
      }
    }
  };

  // Logic nhận diện trạng thái "Đã xem"
  const isUpToDateOrViewed = !latestVer || user?.lastViewedVersion === latestVer?.versionCode;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === "android"}
      />

      <LinearGradient
        colors={["#F8FBFF", "#EAF3FF", "#CFE3FF", "#86B8FF", "#2563EB"]}
        locations={[0, 0.35, 0.6, 0.82, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.75)",
          "transparent",
          "rgba(15,23,42,0.18)",
        ]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

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

        {/* ======================================================== */}
        {/* KHU VỰC CẬP NHẬT PHIÊN BẢN */}
        {/* ======================================================== */}
        <View style={styles.updateContainer}>
          
          {isAdminPhone ? (
            /* --- GIAO DIỆN DÀNH RIÊNG CHO ADMIN (SĐT 096...) --- */
            <View style={styles.adminBox}>
              <Text style={styles.adminTitle}>Đăng bản cập nhật mới (Admin)</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Phiên bản (VD: v1.0.5)"
                placeholderTextColor="#9CA3AF"
                value={newVersionCode}
                onChangeText={setNewVersionCode}
              />
              <TextInput
                style={styles.input}
                placeholder="Link tải (http...)"
                placeholderTextColor="#9CA3AF"
                value={newDownloadUrl}
                onChangeText={setNewDownloadUrl}
              />
              
              <Pressable 
                onPress={handlePublishVersion} 
                disabled={isPublishing}
                style={[styles.btnAction, { backgroundColor: '#1877F2', marginTop: 8 }]}
              >
                <Text style={styles.btnText}>{isPublishing ? "Đang đẩy..." : "Cập nhật App"}</Text>
              </Pressable>

              {latestVer && (
                <Text style={{ marginTop: 10, fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
                  Bản hiện tại trên hệ thống: {latestVer.versionCode}
                </Text>
              )}
            </View>

          ) : latestVer ? (
            /* --- GIAO DIỆN CHO NGƯỜI DÙNG BÌNH THƯỜNG --- */
            <View style={styles.userBox}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verText, { color: isUpToDateOrViewed ? '#6B7280' : '#1D4ED8' }]}>
                  {isUpToDateOrViewed ? "Đã xem bản mới nhất:" : "🎉 Có phiên bản mới:"} {latestVer.versionCode}
                </Text>
                <Text style={styles.dateText}>
                  Cập nhật ngày: {new Date(latestVer.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>

              <Pressable 
                onPress={handleUpdate} 
                style={[
                  styles.btnUpdate, 
                  // Đổi màu nút dựa trên trạng thái đã xem
                  { backgroundColor: isUpToDateOrViewed ? '#E5E7EB' : '#1877F2' }
                ]}
              >
                <Text style={[
                  styles.btnText, 
                  { color: isUpToDateOrViewed ? '#374151' : 'white' }
                ]}>
                  {isUpToDateOrViewed ? "Xem lại" : "Cập nhật"}
                </Text>
              </Pressable>
            </View>
          ) : null}

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 14 },
  brandText: { fontSize: 34, fontWeight: "900", color: "#26538e", letterSpacing: 0.2 },
  subtitle: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "rgba(15,23,42,0.70)", textAlign: "center" },
  cardWrap: { width: "100%", maxWidth: 460, marginTop: 6 },
  grid2: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  
  // --- Style cho cụm Update ---
  updateContainer: {
    width: "100%",
    maxWidth: 460,
    marginTop: 20,
  },
  adminBox: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  btnAction: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  verText: {
    fontSize: 14,
    fontWeight: "900",
  },
  dateText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  btnUpdate: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginLeft: 12,
  },
  btnText: {
    fontWeight: "bold",
    fontSize: 13,
  }
});