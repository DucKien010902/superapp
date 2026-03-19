import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { http } from "@/lib/http";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

function normalizePhone(input: string) {
  // chỉ giữ số
  return String(input || "").replace(/\D/g, "");
}

function Field({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "white",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color="#111827" />
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{
          flex: 1,
          fontSize: 15,
          color: "#111827",
          paddingVertical: 2,
        }}
      />
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  iconName = "log-in-outline",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
}) {
  const isDisabled = !!disabled || !!loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => ({
        opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1,
        borderRadius: 18,
        overflow: "hidden",
      })}
    >
      <LinearGradient
        colors={["#1340a1", "#1340a1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name={iconName} size={18} color="white" />
        )}
        <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
          {loading ? "Đang xử lý..." : title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { signIn, reset, hasSavedToken, unlockWithBiometric } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ✅ Tự động gọi FaceID/Vân tay nếu phát hiện có token cũ còn hạn
  useEffect(() => {
    if (hasSavedToken) {
      handleBiometricLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSavedToken]);

  const handleBiometricLogin = async () => {
    setErr("");
    setBusy(true);
    const success = await unlockWithBiometric();
    setBusy(false);
    
    if (success) {
      router.replace("/"); // Mở khóa thành công thì cho vào app
    } else {
      setErr("Vui lòng nhập mật khẩu để đăng nhập."); // Hủy quét thì yêu cầu nhập mật khẩu
    }
  };

  const canSubmit = useMemo(() => {
    const p = normalizePhone(phone);
    // VN thường 10 số bắt đầu 0 hoặc 9 số (không nhập 0).
    return p.length >= 9 && password.length >= 1 && !busy;
  }, [phone, password, busy]);

  const onLogin = async () => {
    if (!canSubmit) return;
    setErr("");
    setBusy(true);

    try {
      await reset();

      const r = await http<{ token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({
          phone: normalizePhone(phone),
          password,
        }),
      });

      await signIn(r.token);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message || "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen top={0} bottom={0}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#183776" }}
      >
        <LinearGradient
          colors={["#183776", "#183776", "#183776"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 56,
            paddingBottom: 26,
            paddingHorizontal: 18,
            margin: "auto",
          }}
        >
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900" }}>
            Chào mừng bạn
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
            Đăng nhập để tiếp tục sử dụng SuperApp
          </Text>
        </LinearGradient>

        <View
          style={{
            flex: 1,
            backgroundColor: "#F9FAFB",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: "#EEF2F7",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#1340a1" }}>
              Đăng nhập
            </Text>
            <Text style={{ marginTop: 6, color: "#6B7280" }}>
              Nhập số điện thoại và mật khẩu của bạn.
            </Text>

            <View style={{ marginTop: 14, gap: 10 }}>
              <Field
                icon="call-outline"
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Field
                icon="lock-closed-outline"
                placeholder="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {err ? (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                }}
              >
                <Text style={{ color: "#991B1B", fontWeight: "700" }}>
                  {err}
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: 14, gap: 10 }}>
              {/* Nút đăng nhập truyền thống */}
              <PrimaryButton
                title="Đăng nhập"
                onPress={onLogin}
                disabled={!canSubmit}
                loading={busy && !hasSavedToken} // Chỉ xoay lúc bấm nút login thường
              />

              {/* ✅ Nút đăng nhập bằng Sinh trắc học (Chỉ hiện khi có token cũ) */}
              {hasSavedToken && (
                <PrimaryButton
                  title="Đăng nhập nhanh bằng Sinh trắc học"
                  iconName="finger-print-outline"
                  onPress={handleBiometricLogin}
                  disabled={busy}
                />
              )}
            </View>

            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: "#6B7280" }}>Chưa có tài khoản?</Text>
              <Pressable
                onPress={() => router.push("/register")}
                disabled={busy}
              >
                <Text style={{ color: "#1340a1", fontWeight: "900" }}>
                  Đăng ký
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={{ marginTop: 12, textAlign: "center", color: "#9CA3AF" }}
          >
            Bằng cách đăng nhập, bạn đồng ý với điều khoản sử dụng.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}