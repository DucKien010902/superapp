import { adminCreateFriend } from "@/lib/contact/api";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import KeyboardSafeModalFrame from "./KeyboardSafeModalFrame";

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";

// 1. MANG InputRow RA NGOÀI COMPONENT CHÍNH
const InputRow = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  icon: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) => {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#374151", marginBottom: 6 }}>
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          backgroundColor: "#F9FAFB",
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
        }}
      >
        <Ionicons name={icon} size={18} color="#6B7280" />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(17,24,39,0.35)"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={{
            flex: 1,
            fontSize: 14,
            color: "#111827",
            paddingVertical: 0,
          }}
        />
        {!!value && (
          <Pressable onPress={() => onChangeText("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

// 2. COMPONENT CHÍNH
export default function CreateFriendModal({
  open,
  onClose,
  token,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    return !!displayName.trim() && !!phone.trim() && !loading;
  }, [displayName, phone, loading]);

  const reset = () => {
    setDisplayName("");
    setPhone("");
    setUsername("");
    setErr("");
  };

  const submit = async () => {
    if (!token) return;
    setErr("");
    try {
      setLoading(true);
      await adminCreateFriend(token, {
        displayName: displayName.trim(),
        phone: phone.trim(),
        username: username.trim() || undefined,
      });
      reset();
      onClose();
      onCreated();
    } catch (e: any) {
      setErr(String(e?.message || "Create failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardSafeModalFrame visible={open} onRequestClose={onClose}>
        {/* Code View và Layout của bạn giữ nguyên, không thay đổi gì cả */}
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            maxHeight: "80%",
            borderRadius: 22,
            backgroundColor: "white",
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.9)",
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 4 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: SKY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-add" size={18} color="white" />
              </View>

              <View>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
                  Tạo bạn bè mới
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
                  Nhập thông tin cơ bản để tạo nhanh
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              hitSlop={10}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Ionicons name="close" size={18} color="#111827" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={{ marginTop: 10 }}>
            <InputRow
              label="Tên hiển thị"
              icon="id-card-outline"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ví dụ: Nguyễn Văn A"
              autoCapitalize="words"
            />

            <InputRow
              label="Số điện thoại"
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="Ví dụ: 0912345678"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <InputRow
              label="Username (tuỳ chọn)"
              icon="at-outline"
              value={username}
              onChangeText={setUsername}
              placeholder="Ví dụ: nguyenvana"
              autoCapitalize="none"
            />

            {!!err && (
              <View
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(239,68,68,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.25)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={{ flex: 1, color: "#B91C1C", fontSize: 12, fontWeight: "800" }}>
                  {err}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
             {/* Layout footer của bạn giữ nguyên */}
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "#F9FAFB",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#111827" />
              <Text style={{ fontWeight: "900", color: "#111827" }}>Huỷ</Text>
            </Pressable>

            <Pressable
              disabled={!canSubmit}
              onPress={submit}
              style={{
                flex: 1,
                borderRadius: 14,
                overflow: "hidden",
                opacity: canSubmit ? 1 : 0.55,
              }}
            >
              <View
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: SKY,
                  borderWidth: 1,
                  borderColor: SKY_DARK,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    inset: 0 as any,
                    backgroundColor: "rgba(60, 45, 161, 0.06)",
                    transform: [{ translateY: -8 }],
                  }}
                />
                {loading ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={18} color="white" />}
                <Text style={{ fontWeight: "900", color: "white" }}>Tạo</Text>
              </View>
            </Pressable>
          </View>

          {loading && (
            <View
              style={{
                position: "absolute",
                inset: 0 as any,
                borderRadius: 22,
                backgroundColor: "rgba(255,255,255,0.55)",
                alignItems: "center",
                justifyContent: "center",
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: "rgba(2,132,199,0.92)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <ActivityIndicator color="white" />
                <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>Đang tạo…</Text>
              </View>
            </View>
          )}
          </ScrollView>
        </View>
    </KeyboardSafeModalFrame>
  );
}
