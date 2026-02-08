import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { http } from "@/lib/http";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const { signIn, reset } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onLogin = async () => {
    setErr("");
    setBusy(true);
    try {
      // ✅ xóa token cũ rác (tránh Invalid token do storage cũ)
      await reset();

      const r = await http<{ token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await signIn(r.token);
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen top={12} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "white", padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }}>Đăng nhập</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 12 }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, padding: 12 }}
        />

        {err ? <Text style={{ color: "crimson" }}>{err}</Text> : null}

        <Pressable
          onPress={onLogin}
          disabled={busy}
          style={{ padding: 14, borderRadius: 14, backgroundColor: "#111827", alignItems: "center" }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>{busy ? "..." : "Đăng nhập"}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
