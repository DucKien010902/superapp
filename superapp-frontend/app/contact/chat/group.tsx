// app/chat/group.tsx
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

type SenderObj = {
  _id?: string;
  id?: string;
  name?: string;
  avatarUrl?: string;
  avatar?: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
  };
};

type Msg = {
  _id: string;
  text: string;
  senderId: string; // ✅ BE normalize trả string
  sender?: SenderObj | null; // ✅ BE trả object user ở field sender
  createdAt?: string;
};

function pickSenderName(s?: SenderObj | null) {
  if (!s) return "Người dùng";
  return s.profile?.displayName || s.name || "Người dùng";
}

function pickSenderAvatar(s?: SenderObj | null) {
  if (!s) return "";
  return s.profile?.avatarUrl || s.avatarUrl || s.avatar || "";
}

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

export default function GroupChatScreen() {
  const insets = useSafeAreaInsets();
  const { token, user, loading: authLoading } = useAuth() as any;

  const params = useLocalSearchParams<{
    conversationId: string;
    groupId?: string;
    groupName?: string;
    groupAvatar?: string;
    memberCount?: string;
  }>();

  const conversationId = String(params.conversationId || "");
  const groupName = params.groupName ? String(params.groupName) : "Nhóm chat";
  const groupAvatar = params.groupAvatar ? String(params.groupAvatar) : "";
  const memberCount = params.memberCount ? String(params.memberCount) : "";

  const myId = String(user?.id || "");
  const myName = user?.profile?.displayName || user?.name || "Bạn";
  const myAvatar =
    user?.profile?.avatarUrl || user?.avatarUrl || user?.avatar || "";

  const [items, setItems] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList>(null);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

  // Guard auth
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
            Vui lòng đăng nhập lại để sử dụng chat nhóm.
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
      // server trả tăng dần => đảo để dùng inverted
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
      senderId: myId, // ✅ string
      sender: {
        _id: myId,
        name: myName,
        profile: { displayName: myName, avatarUrl: myAvatar },
        avatarUrl: myAvatar,
        avatar: myAvatar,
      },
      text: t,
      createdAt: new Date().toISOString(),
    };

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
          <Text style={{ fontSize: 26 }}>👥</Text>
        </View>
        <Text
          style={{
            marginTop: 14,
            fontSize: 18,
            fontWeight: "900",
            color: "#111827",
          }}
        >
          Chat nhóm
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#6B7280",
            textAlign: "center",
          }}
        >
          Bắt đầu nhắn tin trong nhóm {groupName} nhé.
        </Text>
      </View>
    );
  }, [groupName]);

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
            uri={groupAvatar}
            size={40}
            fallbackText={groupName?.[0]?.toUpperCase() || "G"}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>
              {groupName}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: "#6B7280" }}>
              {loading
                ? "Đang tải..."
                : memberCount
                ? `${memberCount} thành viên`
                : "Nhóm chat"}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
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
              const sid = String(item.senderId || "");
              const mine = sid === myId;

              // ✅ LẤY TÊN/AVATAR TỪ item.sender (do BE trả về)
              const senderName = mine ? myName : pickSenderName(item.sender);
              const senderAvatar = mine ? myAvatar : pickSenderAvatar(item.sender);

              // inverted => prev/next block detection
              const prev = items[index + 1];
              const next = items[index - 1];

              const prevSame =
                prev && String(prev.senderId) === String(item.senderId);
              const nextSame =
                next && String(next.senderId) === String(item.senderId);

              const showAvatar = !nextSame;
              const showName = !mine && !prevSame; // show tên ở đầu block của người khác

              const avatarSize = 30;

              const myBubbleBg = "#E0F2FE";
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
                        uri={senderAvatar}
                        size={avatarSize}
                        fallbackText={senderName?.[0]?.toUpperCase() || "U"}
                      />
                    ) : (
                      <View style={{ width: avatarSize, height: avatarSize }} />
                    )}
                  </View>

                  {/* Bubble */}
                  <View style={{ maxWidth: "78%" }}>
                    {showName ? (
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          marginBottom: 4,
                          marginLeft: 6,
                          fontWeight: "800",
                        }}
                      >
                        {senderName}
                      </Text>
                    ) : null}

                    <View
                      style={{
                        backgroundColor: mine ? myBubbleBg : otherBubbleBg,
                        borderRadius: 18,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderTopLeftRadius: mine ? 18 : prevSame ? 8 : 18,
                        borderTopRightRadius: mine ? (prevSame ? 8 : 18) : 18,
                        borderBottomLeftRadius: mine ? 18 : nextSame ? 8 : 18,
                        borderBottomRightRadius: mine ? (nextSame ? 8 : 18) : 18,
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

          {/* Input */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingTop: 10,
              paddingBottom: 24 + insets.bottom,
              backgroundColor: "rgba(255,255,255,0.98)",
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
            }}
          >
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
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
                  placeholder={`Nhắn tin trong ${groupName}...`}
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
                  backgroundColor: sending || !text.trim() ? "#9CA3AF" : "#111827",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {sending ? "..." : "Gửi"}
                </Text>
              </Pressable>
            </View>

            <Text style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
              Bạn đang chat trong nhóm {groupName}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
