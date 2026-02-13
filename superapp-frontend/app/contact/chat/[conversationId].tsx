import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { fetchMessages, sendMessage } from "@/lib/contact/api";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Msg = {
  _id: string;
  text: string;
  senderId: string;
  createdAt?: string;
};

function Avatar({
  uri,
  size = 34,
  fallbackText = "U",
}: {
  uri?: string;
  size?: number;
  fallbackText?: string;
}) {
  if (!uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "900", color: "#111827" }}>
          {fallbackText}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E5E7EB",
      }}
    />
  );
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { token, user, loading: authLoading } = useAuth() as any;

  const params = useLocalSearchParams<{
    conversationId: string;
    otherUserId?: string;
    otherName?: string;
    otherAvatar?: string;
  }>();

  const conversationId = String(params.conversationId || "");
  const otherUserId = String(params.otherUserId || "");
  const otherName = params.otherName ? String(params.otherName) : "Người dùng";
  const otherAvatar = params.otherAvatar ? String(params.otherAvatar) : "";

  const myId = String(user?.id || "");
  const myName = user?.profile?.displayName || user?.name || "Bạn";
  const myAvatar =
    user?.profile?.avatarUrl || user?.avatarUrl || user?.avatar || "";

  const [items, setItems] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // inverted list => ref scrollToOffset(0) là xuống đáy (tin mới nhất)
  const listRef = useRef<FlatList>(null);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

  // Guard để tránh render sai mine/other lúc chưa có user
  if (authLoading) {
    return (
      <Screen top={8} bottom={0}>
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#111827", fontWeight: "800" }}>
            Đang tải tài khoản...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!token) {
    return (
      <Screen top={8} bottom={0}>
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Text style={{ color: "#111827", fontWeight: "900" }}>
            Bạn chưa đăng nhập
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Vui lòng đăng nhập lại để sử dụng chat.
          </Text>
        </View>
      </Screen>
    );
  }

  if (!myId) {
    return (
      <Screen top={8} bottom={0}>
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Text style={{ color: "#111827", fontWeight: "900" }}>
            Thiếu thông tin tài khoản
          </Text>
          <Text
            style={{
              marginTop: 6,
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Không xác định được người gửi (myId). Hãy thử thoát ra vào lại.
          </Text>
        </View>
      </Screen>
    );
  }

  const load = async (scroll = false) => {
    if (!token || !conversationId) return;
    setLoading(true);
    try {
      const r = await fetchMessages(token, conversationId);
      // server đang trả items theo thời gian tăng dần
      // inverted list cần dữ liệu theo thời gian giảm dần (mới nhất đầu mảng)
      const arr = ((r.items || []) as Msg[]).slice().reverse();
      setItems(arr);
      if (scroll) scrollToBottom(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, conversationId]);

  const onSend = async () => {
    const t = text.trim();
    if (!t || !token || !conversationId || sending) return;

    setSending(true);
    setText("");

    const optimistic: Msg = {
      _id: `local-${Date.now()}`,
      senderId: myId,
      text: t,
      createdAt: new Date().toISOString(),
    };

    // inverted => tin mới nhất nằm đầu mảng
    setItems((prev) => [optimistic, ...prev]);
    scrollToBottom(true);

    try {
      await sendMessage(token, conversationId, t);
      await load(true);
    } catch (e) {
      setItems((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(t);
    } finally {
      setSending(false);
      scrollToBottom(true);
    }
  };

  const Empty = useMemo(() => {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>💬</Text>
        </View>
        <Text
          style={{
            marginTop: 14,
            fontSize: 18,
            fontWeight: "900",
            color: "#111827",
          }}
        >
          Hãy nhắn tin
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#6B7280",
            textAlign: "center",
          }}
        >
          Bắt đầu cuộc trò chuyện với {otherName} nhé.
        </Text>
      </View>
    );
  }, [otherName]);

  return (
    <Screen top={8} bottom={0}>
      <View style={{ flex: 1, backgroundColor: "white" }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Avatar
            uri={otherAvatar}
            size={38}
            fallbackText={otherName?.[0]?.toUpperCase() || "U"}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>
              {otherName}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
              {loading
                ? "Đang tải..."
                : otherUserId
                  ? `ID: ${otherUserId}`
                  : "Cuộc trò chuyện"}
            </Text>
          </View>
        </View>

        {/* ✅ Không absolute nữa: để KeyboardAvoidingView đẩy lên tự nhiên */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            // header ~ 56-60px + safeArea top do Screen xử lý
            Platform.OS === "ios" ? 64 : 0
          }
        >
          {/* Messages */}
          <FlatList
            ref={listRef}
            inverted
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingTop: 14,
              paddingBottom: 12,
              flexGrow: items.length ? 0 : 1,
            }}
            data={items}
            keyExtractor={(m) => m._id}
            ListEmptyComponent={Empty}
            onContentSizeChange={() => scrollToBottom(false)}
            renderItem={({ item, index }) => {
              const mine = String(item.senderId) === myId;

              // inverted => "next" trong UI là index-1 trong data
              const prev = items[index + 1];
              const next = items[index - 1];

              const prevSame =
                prev && String(prev.senderId) === String(item.senderId);
              const nextSame =
                next && String(next.senderId) === String(item.senderId);

              const showAvatar = !nextSame; // avatar ở cuối block (theo UI)
              const avatarSize = 30;

              // ✅ màu tin nhắn của bạn: nền sáng, chữ đen
              const myBubbleBg = "#E0F2FE"; // xanh nhạt (tailwind: sky-100)
              const otherBubbleBg = "#F3F4F6";

              return (
                <View
                  style={{
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    marginBottom: 6,
                  }}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 40,
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    {showAvatar ? (
                      <Avatar
                        uri={mine ? myAvatar : otherAvatar}
                        size={avatarSize}
                        fallbackText={
                          (mine ? myName : otherName)?.[0]?.toUpperCase() || "U"
                        }
                      />
                    ) : (
                      <View style={{ width: avatarSize, height: avatarSize }} />
                    )}
                  </View>

                  {/* Bubble */}
                  <View style={{ maxWidth: "78%" }}>
                    <View
                      style={{
                        backgroundColor: mine ? myBubbleBg : otherBubbleBg,
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderTopLeftRadius: mine ? 18 : prevSame ? 8 : 18,
                        borderTopRightRadius: mine ? (prevSame ? 8 : 18) : 18,
                        borderBottomLeftRadius: mine ? 18 : nextSame ? 8 : 18,
                        borderBottomRightRadius: mine
                          ? nextSame
                            ? 8
                            : 18
                          : 18,
                      }}
                    >
                      <Text
                        style={{
                          color: "#111827",
                          fontSize: 14,
                          lineHeight: 20,
                        }}
                      >
                        {item.text}
                      </Text>
                    </View>

                    {showAvatar ? (
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#9CA3AF",
                          marginTop: 4,
                          marginLeft: mine ? 0 : 6,
                          textAlign: mine ? "right" : "left",
                        }}
                      >
                        {formatTime(item.createdAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />

          {/* Input Bar */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 10,
              paddingBottom: 0 + insets.bottom, // ✅ dính đáy + safe area
              backgroundColor: "rgba(255,255,255,0.98)",
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}
            >
              <View
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 18,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: "white",
                }}
              >
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={`Nhắn tin cho ${otherName}...`}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  style={{
                    minHeight: 26,
                    maxHeight: 140,
                    color: "#111827",
                    fontSize: 15,
                    lineHeight: 20,
                  }}
                  onFocus={() => scrollToBottom(true)}
                />
              </View>

              <Pressable
                onPress={onSend}
                disabled={sending || !text.trim()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor:
                    sending || !text.trim() ? "#9CA3AF" : "#111827",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {sending ? "..." : "Gửi"}
                </Text>
              </Pressable>
            </View>

            <Text style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
              Bạn đang chat với {otherName}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
