import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { http } from "@/lib/http";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
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
          <ActivityIndicator />
        ) : (
          <Ionicons name="person-add-outline" size={18} color="white" />
        )}
        <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
          {loading ? "Đang tạo tài khoản..." : title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const { signIn, reset } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    if (busy) return false;

    const p = normalizePhone(phone);
    if (!name.trim()) return false;
    if (p.length < 9) return false; // nới lỏng/siết tuỳ bạn
    if (password.length < 6) return false;
    if (password !== password2) return false;

    return true;
  }, [name, phone, password, password2, busy]);

  const onRegister = async () => {
    if (!canSubmit) return;
    setErr("");
    setBusy(true);

    try {
      await reset();

      const r = await http<{ token: string }>("/api/auth/register", null, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizePhone(phone),
          password,
        }),
      });

      await signIn(r.token);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message || "Đăng ký thất bại");
    } finally {
      setBusy(false);
    }
  };

  const passHint =
    password.length > 0 && password.length < 6
      ? "Mật khẩu tối thiểu 6 ký tự."
      : password2.length > 0 && password !== password2
        ? "Mật khẩu nhập lại chưa khớp."
        : "";

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
            Tạo tài khoản
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
            Đăng ký nhanh để bắt đầu sử dụng.
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
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
              Đăng ký
            </Text>
            <Text style={{ marginTop: 6, color: "#6B7280" }}>
              Điền thông tin để tạo tài khoản mới.
            </Text>

            <View style={{ marginTop: 14, gap: 10 }}>
              <Field
                icon="person-outline"
                placeholder="Họ và tên"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Field
                icon="call-outline"
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Field
                icon="lock-closed-outline"
                placeholder="Mật khẩu (>= 6 ký tự)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Field
                icon="repeat-outline"
                placeholder="Nhập lại mật khẩu"
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry
              />
            </View>

            {passHint ? (
              <Text
                style={{ marginTop: 10, color: "#B45309", fontWeight: "700" }}
              >
                {passHint}
              </Text>
            ) : null}

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

            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                title="Tạo tài khoản"
                onPress={onRegister}
                disabled={!canSubmit}
                loading={busy}
              />
            </View>

            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Text style={{ color: "#6B7280" }}>Đã có tài khoản?</Text>
              <Pressable
                onPress={() => router.replace("/login")}
                disabled={busy}
              >
                <Text style={{ color: "#1340a1", fontWeight: "900" }}>
                  Đăng nhập
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={{ marginTop: 12, textAlign: "center", color: "#9CA3AF" }}
          >
            Tạo tài khoản nghĩa là bạn đồng ý với điều khoản sử dụng.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
