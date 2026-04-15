import SearchBar from "@/components/contact/SearchBar";
import Screen from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { fetchNewsArticles } from "@/lib/contact/api";
import type { NewsArticle } from "@/lib/contact/types";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

const SKY = "#0284C7";

function NewsCard({ item }: { item: NewsArticle }) {
  const openSource = async () => {
    if (!item.sourceUrl) return;
    await WebBrowser.openBrowserAsync(item.sourceUrl);
  };

  return (
    <Pressable
      onPress={openSource}
      style={{
        backgroundColor: "white",
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: "100%", height: 172, backgroundColor: "#E5E7EB" }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: "100%",
            height: 172,
            backgroundColor: "#E0F2FE",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#075985" }}>
            Báo Chính phủ
          </Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Text
          numberOfLines={3}
          style={{
            fontSize: 15,
            lineHeight: 22,
            fontWeight: "800",
            color: "#111827",
          }}
        >
          {item.title}
        </Text>

        <Text
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: "700",
            color: SKY,
          }}
        >
          {item.publishedLabel || "Mới cập nhật"}
        </Text>

        <Text
          numberOfLines={4}
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 18,
            color: "#4B5563",
          }}
        >
          {item.summary || "Chưa có mô tả ngắn."}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NewsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setItems([]);
        setError("Bạn cần đăng nhập để xem tin tức.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchNewsArticles(token, { limit: 10 });
        setItems(data);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Không thể tải tin tức.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      load("initial");
    }, [load])
  );

  const filteredItems = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const summary = String(item.summary || "").toLowerCase();
      return title.includes(keyword) || summary.includes(keyword);
    });
  }, [items, q]);

  const headerCountText = (() => {
    if (loading && filteredItems.length === 0) return "Đang tải...";
    if (q.trim()) return `${filteredItems.length} kết quả`;
    return `${filteredItems.length} bài viết`;
  })();

  return (
    <Screen style={{ backgroundColor: "white" }} top={8}>
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Tìm tiêu đề hoặc nội dung..."
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
          {q.trim() ? "Kết quả tin tức" : "Tin tức"}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>
          {headerCountText}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={SKY} />
          <Text style={{ marginTop: 12, color: "#6B7280" }}>Đang tải tin tức...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 120,
            gap: 14,
          }}
          renderItem={({ item }) => <NewsCard item={item} />}
          ListEmptyComponent={
            <View
              style={{
                marginTop: 24,
                borderRadius: 18,
                padding: 18,
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
                Chưa có bài viết
              </Text>
              <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 20, color: "#6B7280" }}>
                {error || "Backend chưa đồng bộ được tin tức mới từ nguồn."}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
