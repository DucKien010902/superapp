import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import { useAuth } from "@/lib/auth";
import { fetchGroupById, fetchGroupMembers, fetchGroups } from "@/lib/contact/api";
import type { Friend, Group, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type GroupTreeNode = Group & {
  children: GroupTreeNode[];
  depth: number;
  subtreeWidth: number;
  x: number;
  y: number;
};

type MemberRow = {
  userId: string;
  role: "owner" | "admin" | "member";
  isMuted?: boolean;
  createdAt?: string;
  user?: UserPublic | null;
};

const SKY = "#0284C7";
const SKY_DARK = "#075985";
const SKY_SOFT = "#E0F2FE";

const NODE_W = 200;
const NODE_H = 100;
const H_GAP = 30;
const V_GAP = 90;
const PADDING = 80;

const DEFAULT_SCALE = 0.6;
const MIN_SCALE = 0.25;
const MAX_SCALE = 1;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function toFriend(user?: UserPublic | null, fallbackId = ""): Friend {
  return {
    id: user?.id || fallbackId,
    name: user?.profile?.displayName || `Người dùng ${String(fallbackId).slice(-4)}`,
    phone: user?.profile?.phone || "",
    avatar: user?.profile?.avatarUrl || "",
  };
}

function shadowCard() {
  return {
    shadowColor: "#082F49",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  } as const;
}

function layoutTree(root: GroupTreeNode) {
  // 1. Hàm measure giữ nguyên: Tính toán độ rộng của từng nhánh
  const measure = (node: GroupTreeNode): number => {
    if (!node.children.length) {
      node.subtreeWidth = NODE_W;
      return NODE_W;
    }

    const total = node.children.reduce((sum, child, index) => {
      const childWidth = measure(child);
      return sum + childWidth + (index > 0 ? H_GAP : 0);
    }, 0);

    node.subtreeWidth = Math.max(NODE_W, total);
    return node.subtreeWidth;
  };

  // 2. Hàm position viết lại: Khóa cứng centerX và tỏa các node con ra 2 bên
  const position = (node: GroupTreeNode, centerX: number, depth: number) => {
    node.depth = depth;
    node.x = centerX; // Khóa cứng X tại trục trung tâm truyền vào
    node.y = depth * (NODE_H + V_GAP);

    // Tính tổng chiều rộng thực tế của toàn bộ hàng node con
    const rowWidth = node.children.reduce(
      (sum, child, index) => sum + child.subtreeWidth + (index > 0 ? H_GAP : 0),
      0
    );

    // Tìm tọa độ xuất phát (lùi về bên trái một nửa tổng chiều rộng)
    let cursor = centerX - rowWidth / 2;

    // Sắp xếp các node con lần lượt từ trái sang phải
    node.children.forEach((child) => {
      // Tọa độ trung tâm của node con = điểm bắt đầu + nửa chiều rộng của chính nó
      const childCenterX = cursor + child.subtreeWidth / 2;
      position(child, childCenterX, depth + 1);
      
      // Tịnh tiến con trỏ sang phải cho node con tiếp theo
      cursor += child.subtreeWidth + H_GAP;
    });
  };

  measure(root);
  // Khởi chạy với Root bị khóa cứng ở tọa độ x = 0
  position(root, 0, 0); 
  
  return root;
}

function shiftTree(node: GroupTreeNode): GroupTreeNode {
  return {
    ...node,
    x: node.x + PADDING,
    y: node.y + PADDING,
    children: node.children.map(shiftTree),
  };
}

function treeDepth(node: GroupTreeNode): number {
  return node.children.length ? Math.max(...node.children.map(treeDepth)) + 1 : 0;
}

function collectConnectors(node: GroupTreeNode) {
  const items: {
    id: string;
    verticalLeft: number;
    verticalTop: number;
    verticalHeight: number;
    horizontalLeft: number;
    horizontalTop: number;
    horizontalWidth: number;
  }[] = [];

  const walk = (current: GroupTreeNode) => {
    if (!current.children.length) return;

    const branchTop = current.y + NODE_H;
    const branchMid = branchTop + V_GAP / 2;
    const childXs = current.children.map((child) => child.x);

    items.push({
      id: `root-${current.id}`,
      verticalLeft: current.x,
      verticalTop: branchTop,
      verticalHeight: V_GAP / 2,
      horizontalLeft: Math.min(...childXs),
      horizontalTop: branchMid,
      horizontalWidth: Math.max(...childXs) - Math.min(...childXs),
    });

    current.children.forEach((child) => {
      items.push({
        id: `child-${current.id}-${child.id}`,
        verticalLeft: child.x,
        verticalTop: branchMid,
        verticalHeight: child.y - branchMid,
        horizontalLeft: child.x,
        horizontalTop: branchMid,
        horizontalWidth: 0,
      });
      walk(child);
    });
  };

  walk(node);
  return items;
}

function renderNodes(
  node: GroupTreeNode,
  rootId: string,
  selectedId: string | null,
  onSelect: (group: GroupTreeNode) => void
): ReactNode[] {
  const isSelected = node.id === selectedId;
  const isRoot = node.id === rootId;

  const nodes: ReactNode[] = [
    <Pressable
      key={node.id}
      onPress={() => onSelect(node)}
      style={[
        {
          position: "absolute",
          left: node.x - NODE_W / 2,
          top: node.y,
          width: NODE_W,
          height: NODE_H,
          borderRadius: 24,
          overflow: "hidden",
        },
        shadowCard(),
      ]}
    >
      <LinearGradient
        colors={
          isSelected
            ? ["#082F49", "#0C4A6E", "#0369A1"]
            : isRoot
              ? ["#082F49", "#0F766E", "#0EA5E9"]
              : ["#FFFFFF", "#F8FAFC"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1.5,
          borderColor: isSelected
            ? "rgba(255,255,255,0.4)"
            : isRoot
              ? "rgba(14,165,233,0.5)"
              : "rgba(226,232,240,0.8)",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            fontSize: 16,
            lineHeight: 22,
            fontWeight: "800",
            textAlign: "center",
            color: isRoot || isSelected ? "white" : "#0F172A",
          }}
        >
          {node.name}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
          <View
            style={{
              flex: 1,
              borderRadius: 12,
              backgroundColor: isRoot || isSelected ? "rgba(255,255,255,0.15)" : "#EFF6FF",
              paddingVertical: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: isRoot || isSelected ? "white" : "#0369A1" }}>
              {node.memberIds.length} TV
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 12,
              backgroundColor: isRoot || isSelected ? "rgba(255,255,255,0.15)" : "#F0FDF4",
              paddingVertical: 6,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "800", color: isRoot || isSelected ? "white" : "#15803D" }}>
              {node.children.length} Nhóm
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>,
  ];

  node.children.forEach((child) => {
    nodes.push(...renderNodes(child, rootId, selectedId, onSelect));
  });

  return nodes;
}

export default function GroupTreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<GroupTreeNode | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupTreeNode | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: screenWidth, height: screenHeight });

  const scale = useSharedValue(DEFAULT_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Gesture shared values
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scaleOffset = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const loadTree = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    setError(null);

    try {
      const buildNode = async (groupId: string, depth = 0): Promise<GroupTreeNode> => {
        const current = await fetchGroupById(token, groupId);
        const children = await fetchGroups(token, { parentId: groupId });
        const nested = await Promise.all(children.map((child) => buildNode(child.id, depth + 1)));

        return {
          ...current,
          children: nested,
          depth,
          subtreeWidth: NODE_W,
          x: 0,
          y: 0,
        };
      };

      const built = layoutTree(await buildNode(id, 0));
      const shifted = shiftTree(built);

      setTree(shifted);
      setSelectedGroup(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Không tải được sơ đồ nhóm";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (!selectedGroup || !token) return;

    let active = true;
    setMembersLoading(true);

    fetchGroupMembers(token, selectedGroup.id)
      .then((res) => {
        if (!active) return;
        setSelectedMembers(res.items || []);
      })
      .catch(() => {
        if (!active) return;
        setSelectedMembers([]);
      })
      .finally(() => {
        if (active) setMembersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedGroup, token]);

  const connectors = useMemo(() => (tree ? collectConnectors(tree) : []), [tree]);

  const canvasWidth = tree ? tree.subtreeWidth + PADDING * 2 : screenWidth;
  const canvasHeight = tree
    ? (treeDepth(tree) + 1) * NODE_H + treeDepth(tree) * V_GAP + PADDING * 2
    : screenHeight * 0.7;

  // GIẢI QUYẾT LỖI 1: Luôn neo Node Root vào vị trí cố định
  // GIẢI QUYẾT LỖI 1: Luôn neo Node Root vào vị trí cố định, kích thước cố định
  const centerTree = useCallback(
    (animated: boolean = false) => {
      if (!tree || !viewportSize.width || !viewportSize.height) return;

      // 1. CỐ ĐỊNH SCALE: Không thu nhỏ theo kích thước canvas nữa. 
      // Luôn bắt đầu bằng DEFAULT_SCALE để kích thước các card luôn đồng đều.
      const nextScale = DEFAULT_SCALE; 
      
      // 2. TỌA ĐỘ NEO TRÊN MÀN HÌNH: Điểm bạn muốn node Root xuất hiện
      const targetScreenX = viewportSize.width / 2; 
      const targetScreenY = viewportSize.height / 4;

      // 3. CÔNG THỨC TRANSLATE CHUẨN: 
      // Dịch chuyển màn hình sao cho tọa độ (tree.x, tree.y) của Root trùng khớp với (targetScreenX, targetScreenY)
      const nextX = targetScreenX - tree.x * nextScale;
      const nextY = targetScreenY - tree.y * nextScale;

      if (animated) {
        scale.value = withTiming(nextScale);
        translateX.value = withTiming(nextX);
        translateY.value = withTiming(nextY);
      } else {
        scale.value = nextScale;
        translateX.value = nextX;
        translateY.value = nextY;
      }
    },
    [tree, viewportSize.height, viewportSize.width, scale, translateX, translateY]
  );

  useEffect(() => {
    if (!tree) return;
    centerTree(false);
  }, [tree, viewportSize.width, viewportSize.height, centerTree]);

  // Cập nhật hàm setZoom để khi bấm nút cộng trừ nó zoom vào giữa màn hình mượt mà hơn
  const setZoom = useCallback(
    (nextScaleVal: number) => {
      const nextScale = clamp(nextScaleVal, MIN_SCALE, MAX_SCALE);
      const currentScale = scale.value;
      const screenCenterX = viewportSize.width / 2;
      const screenCenterY = viewportSize.height / 2;
      
      const scaleRatio = nextScale / currentScale;

      translateX.value = withTiming(screenCenterX + (translateX.value - screenCenterX) * scaleRatio);
      translateY.value = withTiming(screenCenterY + (translateY.value - screenCenterY) * scaleRatio);
      scale.value = withTiming(nextScale);
    },
    [scale, translateX, translateY, viewportSize]
  );

  // GIẢI QUYẾT LỖI 2: Dùng Gesture.Simultaneous và áp dụng công thức ma trận chuẩn
  const pan = Gesture.Pan()
    .onStart(() => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      scaleOffset.value = scale.value;
      originX.value = event.focalX;
      originY.value = event.focalY;
    })
    .onUpdate((event) => {
      const nextScale = clamp(scaleOffset.value * event.scale, MIN_SCALE, MAX_SCALE);
      scale.value = nextScale;

      // Tính toán độ dời của điểm focal trong quá trình vừa vuốt vừa zoom
      const focalMovementX = event.focalX - originX.value;
      const focalMovementY = event.focalY - originY.value;

      const scaleRatio = nextScale / scaleOffset.value;

      translateX.value =
        offsetX.value + focalMovementX + (originX.value - offsetX.value) * (1 - scaleRatio);
      translateY.value =
        offsetY.value + focalMovementY + (originY.value - offsetY.value) * (1 - scaleRatio);
    });

  // Dùng Simultaneous thay vì Exclusive để có thể vừa vuốt vừa kéo mượt mà như Google Map
  const composedGesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    width: canvasWidth,
    height: canvasHeight,
    transformOrigin: "top left",
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (loading) {
    return (
      <Screen style={{ backgroundColor: "#031525" }} top={0} bottom={0}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator size="large" color="#7DD3FC" />
          <Text style={{ color: "white", fontSize: 14, fontWeight: "800" }}>Đang dựng sơ đồ nhóm...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !tree) {
    return (
      <Screen style={{ backgroundColor: "#031525" }} top={0} bottom={0}>
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "900" }}>
            {error || "Không có dữ liệu sơ đồ"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              alignSelf: "flex-start",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: "#0EA5E9",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>Quay lại</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "#031525" }} top={0} bottom={0}>
      <LinearGradient
        colors={["#02111F", "#052B46", "#062F55"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </Pressable>

            <View style={{ flex: 1, paddingHorizontal: 14 }}>
              <Text
                numberOfLines={1}
                style={{ color: "#E0F2FE", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 }}
              >
                SƠ ĐỒ NHÓM
              </Text>
              <Text
                numberOfLines={1}
                style={{ marginTop: 2, color: "white", fontSize: 12, fontWeight: "900" }}
              >
                {tree.name}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setZoom(scale.value - 0.12)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 15,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="remove" size={20} color="white" />
              </Pressable>

              <Pressable
                onPress={() => setZoom(scale.value + 0.12)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 15,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={20} color="white" />
              </Pressable>

              <Pressable
                onPress={() => centerTree(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 15,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="scan" size={18} color="white" />
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={{ flex: 1, overflow: "hidden" }}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (!width || !height) return;
            setViewportSize((prev) =>
              prev.width === width && prev.height === height ? prev : { width, height }
            );
          }}
        >
          <GestureDetector gesture={composedGesture}>
            <View style={{ flex: 1 }}>
              <Animated.View style={animatedStyle}>
                {connectors.map((connector) => (
                  <View key={connector.id}>
                    <View
                      style={{
                        position: "absolute",
                        left: connector.verticalLeft,
                        top: connector.verticalTop,
                        width: 2,
                        height: connector.verticalHeight,
                        backgroundColor: "rgba(125,211,252,0.75)",
                      }}
                    />
                    {connector.horizontalWidth > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: connector.horizontalLeft,
                          top: connector.horizontalTop,
                          width: connector.horizontalWidth,
                          height: 2,
                          backgroundColor: "rgba(125,211,252,0.75)",
                        }}
                      />
                    ) : null}
                  </View>
                ))}

                {renderNodes(tree, tree.id, selectedGroup?.id || null, setSelectedGroup)}
              </Animated.View>
            </View>
          </GestureDetector>
        </View>

        <KeyboardSafeModalFrame
          visible={!!selectedGroup}
          onRequestClose={() => setSelectedGroup(null)}
          align="end"
          padding={0}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxHeight: "70%",
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#F8FBFF", "#FFFFFF"]}
              style={{
                paddingHorizontal: 18,
                paddingTop: 14,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <View style={{ width: 46, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: SKY_DARK, fontSize: 12, fontWeight: "900" }}>
                    THÀNH VIÊN NHÓM
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{ marginTop: 4, color: "#0F172A", fontSize: 20, fontWeight: "900" }}
                  >
                    {selectedGroup?.name}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedGroup(null)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F1F5F9",
                  }}
                >
                  <Ionicons name="close" size={18} color="#0F172A" />
                </Pressable>
              </View>

              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: SKY_SOFT,
                  }}
                >
                  <Text style={{ color: SKY_DARK, fontSize: 12, fontWeight: "900" }}>
                    {selectedGroup?.memberIds.length || 0} thành viên
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "#ECFDF5",
                  }}
                >
                  <Text style={{ color: "#166534", fontSize: 12, fontWeight: "900" }}>
                    {selectedGroup?.children.length || 0} nhóm con
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {membersLoading ? (
              <View style={{ paddingVertical: 28, alignItems: "center", justifyContent: "center", gap: 10 }}>
                <ActivityIndicator size="small" color={SKY} />
                <Text style={{ color: "#475569", fontWeight: "700" }}>Đang tải thành viên...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 10, paddingBottom: 28 }}>
                {selectedMembers.length === 0 ? (
                  <View
                    style={{
                      borderRadius: 18,
                      padding: 16,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ color: "#64748B", fontWeight: "700" }}>
                      Nhóm này chưa có thành viên nào.
                    </Text>
                  </View>
                ) : (
                  selectedMembers.map((item, index) => (
                    <View
                      key={`${item.userId}-${index}`}
                      style={{
                        borderBottomWidth: index === selectedMembers.length - 1 ? 0 : 1,
                        borderBottomColor: "#F1F5F9",
                        paddingVertical: 4,
                      }}
                    >
                      <ContactRow
                        item={{
                          ...toFriend(item.user, item.userId),
                          secondaryLines: [
                            item.role === "owner"
                              ? "Chủ nhóm"
                              : item.role === "admin"
                                ? "Quản trị viên"
                                : "Thành viên",
                          ],
                        }}
                        onPress={() => {
                          setSelectedGroup(null);
                          router.push(`/contact/user/${item.userId}` as any);
                        }}
                      />
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </Pressable>
        </KeyboardSafeModalFrame>
      </LinearGradient>
    </Screen>
  );
}
