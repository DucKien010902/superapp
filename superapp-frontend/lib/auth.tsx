import { http } from "@/lib/http";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_me";

export type AuthUser = any; // bạn có thể thay bằng type UserPublic / UserMe chuẩn của bạn

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (t?: string | null) => {
    const useToken = typeof t !== "undefined" ? t : token;
    if (!useToken) {
      setUser(null);
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }

    // backend của bạn: GET /api/users/me -> { user: ... }
    const r = await http<{ user: AuthUser }>("/api/users/me", useToken, {
      method: "GET",
    });
    setUser(r.user || null);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(r.user || null));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        const uRaw = await AsyncStorage.getItem(USER_KEY);

        setToken(t);
        setUser(uRaw ? JSON.parse(uRaw) : null);

        // ✅ nếu có token mà chưa có user -> fetch me
        if (t && !uRaw) {
          await refreshMe(t);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (newToken: string) => {
    setToken(newToken);
    await AsyncStorage.setItem(TOKEN_KEY, newToken);

    // ✅ Quan trọng: login xong lấy /me để chat phân biệt đúng mine/other
    await refreshMe(newToken);
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  // ✅ dùng để fix lỗi Invalid token ngay lập tức
  const reset = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signIn,
      signOut,
      reset,
      refreshMe: () => refreshMe(),
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
