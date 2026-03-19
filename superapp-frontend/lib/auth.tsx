import { http } from "@/lib/http";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_me";
const LAST_ACTIVE_KEY = "auth_last_active"; // Thêm key lưu thời gian
const TIMEOUT_MS = 10 * 60 * 1000; // Khóa sau 10 phút để quên (10 * 60 * 1000 ms)

export type AuthUser = any;

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  hasSavedToken: boolean; 
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
  refreshMe: (t?: string) => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>; 
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [savedToken, setSavedToken] = useState<string | null>(null); 
  const appState = useRef(AppState.currentState);

  // Cờ chống lặp khi đang mở bảng vân tay
  const isAuthenticating = useRef(false);

  const refreshMe = async (t?: string | null) => {
    const useToken = typeof t !== "undefined" ? t : token;
    if (!useToken) {
      setUser(null);
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }
    try {
      const r = await http<{ user: AuthUser }>("/api/users/me", useToken, { method: "GET" });
      setUser(r.user || null);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(r.user || null));
    } catch (error: any) {
      if (error?.status === 401) {
        await signOut(); // Token hết hạn thực sự
      }
    }
  };

  // 1. CHẠY LÚC KHỞI ĐỘNG APP (COLD START - TỨC LÀ BỊ KILL RỒI MỞ LẠI)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const t = await AsyncStorage.getItem(TOKEN_KEY);
        if (t) {
          // Bị kill app mở lại -> Chắc chắn bắt quét vân tay
          setSavedToken(t); 
          // Không setToken(t) ở đây để App dừng lại ở màn Login
        }
      } catch (e) {
        console.error("Lỗi khởi tạo Auth:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2. LẮNG NGHE SỰ KIỆN THU NHỎ/MỞ LẠI APP (XỬ LÝ TIMEOUT)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      // Bỏ qua mọi xử lý AppState nếu bảng vân tay đang mở
      if (isAuthenticating.current) return;

      // Khi app bị thu nhỏ
      if (appState.current.match(/active/) && (nextAppState === "inactive" || nextAppState === "background")) {
        // Ghi lại thời điểm thu nhỏ (nếu đang có người đăng nhập)
        if (token) {
          await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
        }
      }

      // Khi app nổi lên lại
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        if (token) {
          const lastActiveStr = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
          if (lastActiveStr) {
            const lastActive = parseInt(lastActiveStr, 10);
            const now = Date.now();
            
            // Nếu đã quá thời gian TIMEOUT_MS (10 phút) -> Khóa
            if (now - lastActive > TIMEOUT_MS) {
              setToken((currentToken) => {
                if (currentToken) {
                  setSavedToken(currentToken);
                  return null; // Đá về Login
                }
                return currentToken;
              });
            }
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  const signIn = async (newToken: string) => {
    setToken(newToken);
    setSavedToken(newToken);
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); // Đánh dấu mốc thời gian
    await refreshMe(newToken);
  };

  const unlockWithBiometric = async () => {
    if (!savedToken) return false;
    
    // Đánh dấu là đang mở bảng vân tay để các logic khác (như AppState) không xen ngang
    isAuthenticating.current = true; 
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        isAuthenticating.current = false;
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Xác thực để mở khóa",
        cancelLabel: "Hủy",
        fallbackLabel: "Dùng mật khẩu", 
      });

      isAuthenticating.current = false; // Tắt cờ khi quét xong

      if (result.success) {
        setToken(savedToken);
        await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); // Cập nhật lại thời gian
        await refreshMe(savedToken);
        return true;
      }
      return false;
    } catch (e) {
      isAuthenticating.current = false;
      return false;
    }
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setSavedToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, LAST_ACTIVE_KEY]);
  };

  const reset = async () => {
    await signOut();
  };

  const value = useMemo(
    () => ({
      token, user, loading, 
      hasSavedToken: !!savedToken, 
      signIn, signOut, reset, refreshMe, unlockWithBiometric,
    }),
    [token, user, loading, savedToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}