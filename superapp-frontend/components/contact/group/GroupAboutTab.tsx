import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
    createGroupNotice,
    createGroupNoticeItem,
    fetchGroupNotices,
    updateGroup,
} from "@/lib/contact/api";
import type { Group, GroupNotice } from "@/lib/contact/types";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />;
}

function SectionTitle({
  icon,
  title,
  right,
}: {
  icon: any;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: "#DBEAFE",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Ionicons name={icon} size={18} color="#1D4ED8" />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>
          {title}
        </Text>
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "blue" | "red";
}) {
  const bg =
    tone === "blue" ? "#DBEAFE" : tone === "red" ? "#FEE2E2" : "#F3F4F6";
  const fg =
    tone === "blue" ? "#1D4ED8" : tone === "red" ? "#B91C1C" : "#374151";
  return (
    <View
      style={{
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "900", color: fg }}>{label}</Text>
    </View>
  );
}

export default function GroupAboutTab({
  token,
  groupId,
  group,
  isOwner,
  onEditGroupPress,
}: {
  token: string;
  groupId: string;
  group: Group;
  isOwner: boolean;
  onEditGroupPress?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [notices, setNotices] = useState<GroupNotice[]>([]);

  // ===== Create main notice (ẩn form, mở modal inline)
  const [createMainOpen, setCreateMainOpen] = useState(false);
  const [creatingMain, setCreatingMain] = useState(false);
  const [mainTitle, setMainTitle] = useState("");

  // ===== Add sub notice
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [subText, setSubText] = useState("");
  const [busySub, setBusySub] = useState(false);

  // ===== Owner action menu per notice
  const [actionFor, setActionFor] = useState<string | null>(null);

  // ===== Confirm delete main
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  // ===== Group edit (giữ nguyên)
  const [editing, setEditing] = useState(false);
  const [busyEdit, setBusyEdit] = useState(false);

  const [nameDraft, setNameDraft] = useState(group.name || "");
  const [descDraft, setDescDraft] = useState(group.description || "");
  const [visDraft, setVisDraft] = useState<Group["visibility"]>(group.visibility);

  useEffect(() => {
    setNameDraft(group.name || "");
    setDescDraft(group.description || "");
    setVisDraft(group.visibility);
  }, [group.id, group.name, group.description, group.visibility]);

  const reload = async () => {
    if (!token || !groupId) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await fetchGroupNotices(token, groupId);
      setNotices(r.items || []);
    } catch (e: any) {
      setErr(e?.message || "Load notices error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [token, groupId]);

  const onCreateMain = async () => {
    if (!token || !groupId) return;
    const t = mainTitle.trim();
    if (!t) return Alert.alert("Thiếu tiêu đề", "Nhập tiêu đề thông báo chính.");

    setCreatingMain(true);
    try {
      await createGroupNotice(token, groupId, { title: t });
      setMainTitle("");
      setCreateMainOpen(false);
      await reload();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tạo được thông báo");
    } finally {
      setCreatingMain(false);
    }
  };

  const onAddSub = async () => {
    if (!token || !groupId || !addingSubFor) return;
    const text = subText.trim();
    if (!text) return Alert.alert("Thiếu nội dung", "Nhập nội dung thông báo phụ.");

    setBusySub(true);
    try {
      await createGroupNoticeItem(token, groupId, addingSubFor, { text });
      setSubText("");
      setAddingSubFor(null);
      await reload();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thêm được thông báo phụ");
    } finally {
      setBusySub(false);
    }
  };

  // ✅ confirm delete bằng Alert (bạn cần API deleteGroupNotice trong api.ts)
  useEffect(() => {
    if (!confirmDeleteId) return;

    Alert.alert(
      "Xóa thông báo?",
      "Bạn chắc chắn muốn xóa thông báo chính này?",
      [
        {
          text: "Hủy",
          style: "cancel",
          onPress: () => setConfirmDeleteId(null),
        },
        {
          text: busyDelete ? "Đang xóa..." : "Xóa",
          style: "destructive",
          onPress: async () => {
            if (!token || !groupId) return;
            setBusyDelete(true);
            try {
              // ⚠️ BỎ COMMENT khi bạn đã có API deleteGroupNotice
              // await deleteGroupNotice(token, groupId, confirmDeleteId);
              // demo: báo nhắc
              Alert.alert(
                "Thiếu API",
                "Bạn cần thêm deleteGroupNotice(token, groupId, noticeId) trong lib/contact/api.ts"
              );
              await reload();
            } catch (e: any) {
              Alert.alert("Lỗi", e?.message || "Không xóa được");
            } finally {
              setBusyDelete(false);
              setConfirmDeleteId(null);
            }
          },
        },
      ]
    );
  }, [confirmDeleteId, busyDelete, token, groupId]);

  const pinned = useMemo(() => notices.filter((n) => n.isPinned), [notices]);
  const normal = useMemo(() => notices.filter((n) => !n.isPinned), [notices]);

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      <SectionTitle icon="information-circle-outline" title="Thông tin nhóm" />
      <Card>
        <View style={{ padding: 14 }}>
          {!editing ? (
            <>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Mô tả</Text>
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#111827",
                  lineHeight: 18,
                }}
              >
                {group.description?.trim() ? group.description : "Chưa có mô tả."}
              </Text>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Pill
                  label={group.visibility === "public" ? "Public" : "Private"}
                  tone="neutral"
                />
              </View>

              {isOwner && (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={{
                    marginTop: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: "#3b68c8",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>Chỉnh sửa</Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Tên nhóm</Text>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Tên nhóm..."
                placeholderTextColor="#9CA3AF"
                style={{
                  marginTop: 8,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                  paddingHorizontal: 12,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  color: "#111827",
                }}
              />

              <Text style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>Mô tả</Text>
              <TextInput
                value={descDraft}
                onChangeText={setDescDraft}
                placeholder="Mô tả..."
                placeholderTextColor="#9CA3AF"
                multiline
                style={{
                  marginTop: 8,
                  minHeight: 70,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                  paddingHorizontal: 12,
                  paddingTop: 10,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  color: "#111827",
                }}
              />

              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setVisDraft("private")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: visDraft === "private" ? "#DBEAFE" : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: visDraft === "private" ? "#1D4ED8" : "#374151",
                    }}
                  >
                    Private
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setVisDraft("public")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: visDraft === "public" ? "#DBEAFE" : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: visDraft === "public" ? "#1D4ED8" : "#374151",
                    }}
                  >
                    Public
                  </Text>
                </Pressable>
              </View>

              <View
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: "flex-end",
                }}
              >
                <Pressable
                  onPress={() => {
                    setEditing(false);
                    setNameDraft(group.name || "");
                    setDescDraft(group.description || "");
                    setVisDraft(group.visibility);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: "#E5E7EB",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: "#111827" }}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busyEdit}
                  onPress={async () => {
                    if (!token || !groupId) return;
                    const name = nameDraft.trim();
                    if (!name) return Alert.alert("Thiếu tên", "Tên nhóm không được rỗng.");

                    setBusyEdit(true);
                    try {
                      await updateGroup(token, groupId, {
                        name,
                        description: descDraft,
                        visibility: visDraft,
                      });
                      setEditing(false);
                    } catch (e: any) {
                      Alert.alert("Lỗi", e?.message || "Không cập nhật được nhóm");
                    } finally {
                      setBusyEdit(false);
                    }
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: busyEdit ? "#E5E7EB" : "#1877F2",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: "white" }}>Lưu</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Card>

      {/* ===== Notices ===== */}
      <View style={{ height: 14 }} />
      <SectionTitle
        icon="megaphone-outline"
        title="Thông báo"
        right={
          isOwner ? (
            <Pressable
              onPress={() => setCreateMainOpen((v) => !v)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                backgroundColor: "#111827",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={createMainOpen ? "close" : "add"} size={18} color="white" />
            </Pressable>
          ) : null
        }
      />

      {/* lỗi */}
      {err && (
        <Card>
          <View style={{ padding: 12 }}>
            <Text style={{ fontSize: 12, color: "#B91C1C" }}>{err}</Text>
            <Pressable
              onPress={reload}
              style={{
                marginTop: 10,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: "#111827",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Tải lại</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {/* loading */}
      {!err && loading && (
        <Card>
          <View style={{ padding: 12 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>Đang tải thông báo…</Text>
          </View>
        </Card>
      )}

      {!err && !loading && (
        <>
          {/* ✅ Owner create main (ẩn/hiện bằng nút +, không phá view member) */}
          {isOwner && createMainOpen && (
            <Card>
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>Tạo thông báo chính</Text>

                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <TextInput
                    value={mainTitle}
                    onChangeText={setMainTitle}
                    placeholder="VD: Lịch họp tuần / Quy định nhóm..."
                    placeholderTextColor="#9CA3AF"
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: "#F9FAFB",
                      paddingHorizontal: 12,
                      fontSize: 13,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      color: "#111827",
                    }}
                  />
                  <Pressable
                    disabled={creatingMain}
                    onPress={onCreateMain}
                    style={{
                      height: 42,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: creatingMain ? "#E5E7EB" : "#1877F2",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="add" size={18} color="white" />
                    <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>Thêm</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          <View style={{ height: 10 }} />

          {notices.length === 0 ? (
            <Card>
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có thông báo nào.</Text>
              </View>
            </Card>
          ) : (
            // ✅ Scroll trong khung: đổi maxHeight theo ý bạn
            <View style={{ maxHeight: 460 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[...pinned, ...normal].map((n) => (
                  <View key={n.id} style={{ marginBottom: 10 }}>
                    <Card>
                      <View style={{ padding: 12, position: "relative" }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "900",
                                color: "#111827",
                              }}
                            >
                              {n.title}
                            </Text>
                            <View
                              style={{
                                marginTop: 6,
                                flexDirection: "row",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {n.isPinned && <Pill label="PIN" tone="blue" />}
                              <Pill
                                label={`${(n.items || []).length} thông báo phụ`}
                                tone="neutral"
                              />
                            </View>
                          </View>
                        </View>

                        {/* ✅ Owner vẫn xem bình thường, chỉ có nút nhỏ góc trái dưới */}
                        {isOwner && (
                          <Pressable
                            onPress={() => setActionFor((cur) => (cur === n.id ? null : n.id))}
                            style={{
                              position: "absolute",
                              right: 10,
                              top: 10,
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: "#111827",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name={actionFor === n.id ? "close" : "pencil"}
                              size={16}
                              color="white"
                            />
                          </Pressable>
                        )}

                        {(n.items || []).length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <Divider />
                            <View style={{ paddingTop: 10, gap: 8 }}>
                              {n.items.map((it) => (
                                <View
                                  key={it.id}
                                  style={{
                                    padding: 10,
                                    borderRadius: 14,
                                    backgroundColor: "#F9FAFB",
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: "#111827",
                                      lineHeight: 18,
                                    }}
                                  >
                                    • {it.text}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    </Card>

                    {/* ✅ Menu thao tác: chỉ hiện khi bấm nút bút */}
                    {isOwner && actionFor === n.id && (
                      <View style={{ marginTop: 8 }}>
                        <Card>
                          <View style={{ padding: 10, gap: 8 }}>
                            <Pressable
                              onPress={() => {
                                setAddingSubFor(n.id);
                                setActionFor(null);
                              }}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 14,
                                backgroundColor: "#111827",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Ionicons name="add" size={18} color="white" />
                              <Text style={{ color: "white", fontWeight: "900" }}>
                                Thêm thông báo phụ
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => {
                                setConfirmDeleteId(n.id);
                                setActionFor(null);
                              }}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 12,
                                borderRadius: 14,
                                backgroundColor: "#FEE2E2",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                borderWidth: 1,
                                borderColor: "#FCA5A5",
                              }}
                            >
                              <Ionicons name="trash" size={18} color="#B91C1C" />
                              <Text style={{ color: "#B91C1C", fontWeight: "900" }}>
                                Xóa thông báo chính
                              </Text>
                            </Pressable>
                          </View>
                        </Card>
                      </View>
                    )}

                    {/* ✅ add sub UI inline (giữ logic cũ) */}
                    {addingSubFor === n.id && (
                      <View style={{ marginTop: 8 }}>
                        <Card>
                          <View style={{ padding: 12 }}>
                            <Text style={{ fontSize: 12, color: "#6B7280" }}>
                              Thêm thông báo phụ
                            </Text>
                            <TextInput
                              value={subText}
                              onChangeText={setSubText}
                              placeholder="Nội dung thông báo phụ..."
                              placeholderTextColor="#9CA3AF"
                              multiline
                              style={{
                                marginTop: 8,
                                minHeight: 60,
                                borderRadius: 14,
                                backgroundColor: "#F9FAFB",
                                paddingHorizontal: 12,
                                paddingTop: 10,
                                fontSize: 13,
                                borderWidth: 1,
                                borderColor: "#E5E7EB",
                                color: "#111827",
                              }}
                            />

                            <View
                              style={{
                                marginTop: 10,
                                flexDirection: "row",
                                gap: 10,
                                justifyContent: "flex-end",
                              }}
                            >
                              <Pressable
                                onPress={() => {
                                  setAddingSubFor(null);
                                  setSubText("");
                                }}
                                style={{
                                  paddingVertical: 10,
                                  paddingHorizontal: 14,
                                  borderRadius: 14,
                                  backgroundColor: "#E5E7EB",
                                }}
                              >
                                <Text style={{ fontWeight: "900", color: "#111827" }}>
                                  Hủy
                                </Text>
                              </Pressable>

                              <Pressable
                                disabled={busySub}
                                onPress={onAddSub}
                                style={{
                                  paddingVertical: 10,
                                  paddingHorizontal: 14,
                                  borderRadius: 14,
                                  backgroundColor: busySub ? "#E5E7EB" : "#1877F2",
                                }}
                              >
                                <Text style={{ fontWeight: "900", color: "white" }}>
                                  Lưu
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </Card>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Owner edit group (giữ nguyên nút cuối nếu bạn vẫn muốn) */}
      
    </View>
  );
}