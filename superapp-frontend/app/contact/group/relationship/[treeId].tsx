import Screen from "@/components/Screen";
import ContactRow from "@/components/contact/ContactRow";
import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import { useAuth } from "@/lib/auth";
import {
  addGroupRelationshipNode,
  deleteGroupRelationshipNode,
  fetchGroupMembers,
  fetchGroupRelationshipTreeById,
  renameGroupRelationshipTree
} from "@/lib/contact/api";
import type { GroupRelationshipTree, UserPublic } from "@/lib/contact/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type MemberRow = {
  userId: string;
  role: "owner" | "admin" | "member";
  user?: UserPublic | null;
};

type LayoutNode = GroupRelationshipTree["nodes"][number] & {
  children: LayoutNode[];
  subtreeWidth: number;
  x: number;
  y: number;
};

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const NODE_W = 150;
const NODE_H = 96;
const H_GAP = 24;
const V_GAP = 80;
const PADDING = 44;
const DEFAULT_SCALE = 0.6;
const MIN_SCALE = 0.25;
const MAX_SCALE = 1;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function buildTree(tree: GroupRelationshipTree | null): LayoutNode | null {
  if (!tree) return null;
  const nodeMap = new Map<string, LayoutNode>();
  for (const item of tree.nodes) nodeMap.set(item.id, { ...item, children: [], subtreeWidth: NODE_W, x: 0, y: 0 });
  let root: LayoutNode | null = null;
  for (const item of nodeMap.values()) {
    if (item.parentNodeId && nodeMap.has(item.parentNodeId)) nodeMap.get(item.parentNodeId)?.children.push(item);
    else root = item;
  }
  if (!root) return null;

  const measure = (node: LayoutNode): number => {
    if (!node.children.length) return (node.subtreeWidth = NODE_W);
    const total = node.children.reduce((sum, child, index) => sum + measure(child) + (index > 0 ? H_GAP : 0), 0);
    node.subtreeWidth = Math.max(NODE_W, total);
    return node.subtreeWidth;
  };
  const position = (node: LayoutNode, centerX: number, depth: number) => {
    node.x = centerX;
    node.y = depth * (NODE_H + V_GAP);
    const rowWidth = node.children.reduce((sum, child, index) => sum + child.subtreeWidth + (index > 0 ? H_GAP : 0), 0);
    let cursor = centerX - rowWidth / 2;
    node.children.forEach((child) => {
      const childCenter = cursor + child.subtreeWidth / 2;
      position(child, childCenter, depth + 1);
      cursor += child.subtreeWidth + H_GAP;
    });
  };

  measure(root);
  position(root, 0, 0);
  const shift = (node: LayoutNode): LayoutNode => ({
    ...node,
    x: node.x + PADDING,
    y: node.y + PADDING,
    children: node.children.map(shift),
  });
  return shift(root);
}

function collectLines(node: LayoutNode | null) {
  const items: { left: number; top: number; width: number; height: number }[] = [];
  if (!node) return items;
  const walk = (current: LayoutNode) => {
    current.children.forEach((child) => {
      items.push({
        left: current.x,
        top: current.y + NODE_H,
        width: 2,
        height: V_GAP / 2,
      });
      items.push({
        left: Math.min(current.x, child.x),
        top: current.y + NODE_H + V_GAP / 2,
        width: Math.abs(child.x - current.x) || 2,
        height: 2,
      });
      items.push({
        left: child.x,
        top: current.y + NODE_H + V_GAP / 2,
        width: 2,
        height: child.y - (current.y + NODE_H + V_GAP / 2),
      });
      walk(child);
    });
  };
  walk(node);
  return items;
}

function flattenNodes(node: LayoutNode | null): LayoutNode[] {
  if (!node) return [];
  return [node, ...node.children.flatMap(flattenNodes)];
}

export default function GroupRelationshipTreeScreen() {
  const { treeId, groupId } = useLocalSearchParams<{ treeId: string; groupId: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [tree, setTree] = useState<GroupRelationshipTree | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [parentNodeId, setParentNodeId] = useState("");
  const [pickerQ, setPickerQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [viewportSize, setViewportSize] = useState({ width: screenWidth, height: screenHeight });

  const scale = useSharedValue(DEFAULT_SCALE);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scaleOffset = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const load = useCallback(async () => {
    if (!token || !groupId || !treeId) return;
    setLoading(true);
    try {
      const [treeData, memberData] = await Promise.all([
        fetchGroupRelationshipTreeById(token, groupId, treeId),
        fetchGroupMembers(token, groupId),
      ]);
      setTree(treeData);
      setMembers(memberData.items || []);
      setRenameValue(treeData.name);
    } finally {
      setLoading(false);
    }
  }, [groupId, token, treeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const laidOutRoot = useMemo(() => buildTree(tree), [tree]);
  const laidOutNodes = useMemo(() => flattenNodes(laidOutRoot), [laidOutRoot]);
  const lines = useMemo(() => collectLines(laidOutRoot), [laidOutRoot]);
  const canvasWidth = useMemo(() => (laidOutRoot ? laidOutRoot.subtreeWidth + PADDING * 2 : 360), [laidOutRoot]);
  const canvasHeight = useMemo(() => Math.max(...laidOutNodes.map((node) => node.y + NODE_H), screenHeight * 0.7) + PADDING, [laidOutNodes, screenHeight]);
  const usedUserIds = useMemo(() => new Set((tree?.nodes || []).map((node) => node.userId)), [tree]);
  const candidateMembers = useMemo(() => {
    const q = pickerQ.trim().toLowerCase();
    return members.filter((member) => !usedUserIds.has(member.userId)).filter((member) => {
      const name = member.user?.profile?.displayName || "";
      const phone = member.user?.profile?.phone || "";
      return !q || name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
    });
  }, [members, pickerQ, usedUserIds]);

  const onAddNode = async (userId: string) => {
    if (!token || !groupId || !treeId) return;
    try {
      setBusy(true);
      const next = await addGroupRelationshipNode(token, groupId, treeId, { userId, parentNodeId: parentNodeId || undefined });
      setTree(next);
      setPickerOpen(false);
      setPickerQ("");
      setParentNodeId("");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thêm được node");
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteBranch = (nodeId: string, label: string) => {
    if (!token || !groupId || !treeId) return;
    Alert.alert("Xóa nhánh", `Bạn muốn xóa nhánh của ${label}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const next = await deleteGroupRelationshipNode(token, groupId, treeId, nodeId);
          setTree(next);
        },
      },
    ]);
  };

  const submitRename = async () => {
    if (!token || !groupId || !treeId) return;
    const name = renameValue.trim();
    if (!name) return;
    await renameGroupRelationshipTree(token, groupId, treeId, { name });
    setRenameOpen(false);
    await load();
  };

  const centerTree = useCallback(
    (animated = false) => {
      if (!laidOutRoot || !viewportSize.width || !viewportSize.height) return;
      const nextScale = DEFAULT_SCALE;
      const targetScreenX = viewportSize.width / 2;
      const targetScreenY = viewportSize.height / 4;
      const nextX = targetScreenX - laidOutRoot.x * nextScale;
      const nextY = targetScreenY - laidOutRoot.y * nextScale;

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
    [laidOutRoot, scale, translateX, translateY, viewportSize.height, viewportSize.width]
  );

  useEffect(() => {
    if (!laidOutRoot) return;
    centerTree(false);
  }, [laidOutRoot, centerTree, viewportSize.width, viewportSize.height]);

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

      const focalMovementX = event.focalX - originX.value;
      const focalMovementY = event.focalY - originY.value;
      const scaleRatio = nextScale / scaleOffset.value;

      translateX.value =
        offsetX.value + focalMovementX + (originX.value - offsetX.value) * (1 - scaleRatio);
      translateY.value =
        offsetY.value + focalMovementY + (originY.value - offsetY.value) * (1 - scaleRatio);
    });

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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white", fontWeight: "800" }}>Đang tải sơ đồ...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: "#031525" }} top={0} bottom={0}>
      <LinearGradient colors={["#02111F", "#052B46", "#062F55"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </Pressable>
            <View style={{ flex: 1, paddingHorizontal: 14 }}>
              <Text style={{ color: "#E0F2FE", fontSize: 12, fontWeight: "800" }}>SƠ ĐỒ QUAN HỆ</Text>
              <Text numberOfLines={1} style={{ marginTop: 2, color: "white", fontSize: 12, fontWeight: "900",  }}>{tree?.name || "Untitled"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setZoom(scale.value - 0.12)} style={{ width: 36, height: 36, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="remove" size={16} color="white" />
              </Pressable>
              <Pressable onPress={() => setZoom(scale.value + 0.12)} style={{ width: 36, height: 36, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="add" size={14} color="white" />
              </Pressable>
              <Pressable onPress={() => centerTree(true)} style={{ width: 36, height: 36, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="scan" size={14} color="white" />
              </Pressable>
              <Pressable onPress={() => setRenameOpen(true)} style={{ width: 36, height: 36, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="create-outline" size={14} color="white" />
              </Pressable>
            </View>
          </View>
        </View>

        {!tree?.nodes.length ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "900", textAlign: "center" }}>Sơ đồ này chưa có root</Text>
            <Text style={{ marginTop: 8, color: "#BFDBFE", textAlign: "center" }}>Chọn một thành viên trong nhóm để khởi tạo node gốc.</Text>
            <Pressable onPress={() => { setParentNodeId(""); setPickerOpen(true); }} style={{ marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: SKY }}>
              <Text style={{ color: "white", fontWeight: "900" }}>Khởi tạo root</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{ flex: 1, overflow: "hidden" }}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (!width || !height) return;
              setViewportSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
            }}
          >
            <GestureDetector gesture={composedGesture}>
              <View style={{ flex: 1 }}>
                <Animated.View style={animatedStyle}>
                  {lines.map((line, index) => (
                    <View key={index} style={{ position: "absolute", left: line.left, top: line.top, width: line.width, height: line.height, backgroundColor: "rgba(125,211,252,0.75)" }} />
                  ))}

                  {laidOutNodes.map((node) => {
                    const name = node.user?.profile?.displayName || `User ${node.userId.slice(-4)}`;
                    const avatar = node.user?.profile?.avatarUrl || "";
                    return (
                      <Pressable
                        key={node.id}
                        onPress={() => router.push(`/contact/user/${node.userId}` as any)}
                        onLongPress={() => confirmDeleteBranch(node.id, name)}
                        style={{ position: "absolute", left: node.x - NODE_W / 2, top: node.y, width: NODE_W, height: NODE_H, borderRadius: 20, overflow: "hidden" }}
                      >
                        <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={{ flex: 1, borderWidth: 1, borderColor: "#DCEAF8", alignItems: "center", justifyContent: "center", padding: 10 }}>
                          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {avatar ? <Image source={{ uri: avatar }} style={{ width: "100%", height: "100%" }} /> : <Text style={{ fontWeight: "900", color: SKY_DARK }}>{initials(name)}</Text>}
                          </View>
                          <Text numberOfLines={2} style={{ marginTop: 8, textAlign: "center", color: "#0F172A", fontSize: 13, fontWeight: "800" }}>{name}</Text>
                          <Pressable onPress={(event) => { event.stopPropagation(); setParentNodeId(node.id); setPickerQ(""); setPickerOpen(true); }} style={{ position: "absolute", right: 8, top: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: SKY, alignItems: "center", justifyContent: "center" }}>
                            <Ionicons name="add" size={16} color="white" />
                          </Pressable>
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </Animated.View>
              </View>
            </GestureDetector>
          </View>
        )}

        <KeyboardSafeModalFrame visible={pickerOpen} onRequestClose={() => setPickerOpen(false)} align="end" padding={0}>
          <Pressable onPress={() => {}} style={{ width: "100%", maxHeight: "80%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }}>
            <View style={{ alignItems: "center", paddingTop: 10 }}><View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} /></View>
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>{parentNodeId ? "Thêm cấp dưới" : "Chọn root"}</Text>
                <Pressable onPress={() => setPickerOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" }}><Ionicons name="close" size={16} color="#111827" /></Pressable>
              </View>
              <View style={{ marginTop: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
                <TextInput value={pickerQ} onChangeText={setPickerQ} placeholder="Tìm thành viên trong nhóm" placeholderTextColor="#9CA3AF" style={{ fontSize: 14, color: "#111827" }} />
              </View>
            </View>
            <FlatList
              data={candidateMembers}
              keyExtractor={(item) => item.userId}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <View style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ContactRow item={{ id: item.userId, name: item.user?.profile?.displayName || item.userId, phone: item.user?.profile?.phone || "", avatar: item.user?.profile?.avatarUrl || "" }} onPress={() => router.push(`/contact/user/${item.userId}` as any)} />
                  </View>
                  <Pressable disabled={busy} onPress={() => onAddNode(item.userId)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: busy ? "#CBD5E1" : SKY, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="add" size={18} color="white" />
                  </Pressable>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />}
              ListEmptyComponent={<View style={{ paddingVertical: 12 }}><Text style={{ fontSize: 12, color: "#6B7280" }}>Không còn thành viên phù hợp để thêm.</Text></View>}
            />
          </Pressable>
        </KeyboardSafeModalFrame>

        <KeyboardSafeModalFrame visible={renameOpen} onRequestClose={() => setRenameOpen(false)} padding={18} backdropColor="rgba(0,0,0,0.35)">
          <View style={{ width: "100%", backgroundColor: "white", borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Đổi tên sơ đồ</Text>
            <View style={{ marginTop: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
              <TextInput value={renameValue} onChangeText={setRenameValue} placeholder="Tên sơ đồ" placeholderTextColor="#9CA3AF" style={{ fontSize: 14, color: "#111827" }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 14 }}>
              <Pressable onPress={() => setRenameOpen(false)} style={{ padding: 10, marginRight: 6 }}><Text style={{ fontWeight: "900", color: "#6B7280" }}>Hủy</Text></Pressable>
              <Pressable onPress={submitRename} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: SKY, borderWidth: 1, borderColor: SKY_DARK }}><Text style={{ color: "white", fontWeight: "900" }}>Lưu tên</Text></Pressable>
            </View>
          </View>
        </KeyboardSafeModalFrame>
      </LinearGradient>
    </Screen>
  );
}
