import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import KeyboardSafeModalFrame from "@/components/contact/KeyboardSafeModalFrame";
import { createGroupPost, fetchGroupPosts, updateGroup, updateGroupPost } from "@/lib/contact/api";
import type { Group, GroupPost } from "@/lib/contact/types";

const SKY = "#0284C7";
const SKY_DARK = "#0369A1";
const SKY_SOFT = "#E0F2FE";

function formatDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN");
}

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
            backgroundColor: SKY_SOFT,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Ionicons name={icon} size={18} color={SKY_DARK} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>{title}</Text>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "900", color: "#374151" }}>{label}</Text>
    </View>
  );
}

function InputModal({
  title,
  open,
  busy,
  value,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  open: boolean;
  busy: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <KeyboardSafeModalFrame visible={open} onRequestClose={onClose} padding={10}>
          <View
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "80%",
              backgroundColor: "white",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
            </View>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>{title}</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            >
              <TextInput
                value={value}
                onChangeText={onChange}
                multiline
                placeholder="Nhập nội dung..."
                placeholderTextColor="#9CA3AF"
                style={{
                  minHeight: 260,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  color: "#111827",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  textAlignVertical: "top",
                }}
              />
            </ScrollView>
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={onClose}
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
                disabled={busy}
                onPress={onSave}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: busy ? "#E5E7EB" : SKY,
                  borderWidth: 1,
                  borderColor: busy ? "#E5E7EB" : SKY_DARK,
                }}
              >
                <Text style={{ fontWeight: "900", color: "white" }}>{busy ? "Đang lưu..." : "Lưu"}</Text>
              </Pressable>
            </View>
          </View>
    </KeyboardSafeModalFrame>
  );
}

function EditGroupModal({
  open,
  busy,
  name,
  description,
  visibility,
  onClose,
  onChangeName,
  onChangeDescription,
  onChangeVisibility,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  name: string;
  description: string;
  visibility: Group["visibility"];
  onClose: () => void;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeVisibility: (v: Group["visibility"]) => void;
  onSave: () => void;
}) {
  return (
    <KeyboardSafeModalFrame visible={open} onRequestClose={onClose} padding={10}>
          <View
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "80%",
              backgroundColor: "white",
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View style={{ width: 44, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1" }} />
            </View>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Sửa thông tin nhóm</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Tên nhóm</Text>
              <TextInput
                value={name}
                onChangeText={onChangeName}
                placeholder="Tên nhóm..."
                placeholderTextColor="#9CA3AF"
                style={{
                  marginTop: 8,
                  height: 52,
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
                value={description}
                onChangeText={onChangeDescription}
                placeholder="Mô tả..."
                placeholderTextColor="#9CA3AF"
                multiline
                style={{
                  marginTop: 8,
                  minHeight: 240,
                  borderRadius: 14,
                  backgroundColor: "#F9FAFB",
                  paddingHorizontal: 12,
                  paddingTop: 10,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  color: "#111827",
                  textAlignVertical: "top",
                }}
              />
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => onChangeVisibility("private")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: visibility === "private" ? SKY_SOFT : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: visibility === "private" ? SKY_DARK : "#374151",
                    }}
                  >
                    Private
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onChangeVisibility("public")}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: visibility === "public" ? SKY_SOFT : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: visibility === "public" ? SKY_DARK : "#374151",
                    }}
                  >
                    Public
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={onClose}
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
                disabled={busy}
                onPress={onSave}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: busy ? "#E5E7EB" : SKY,
                  borderWidth: 1,
                  borderColor: busy ? "#E5E7EB" : SKY_DARK,
                }}
              >
                <Text style={{ fontWeight: "900", color: "white" }}>{busy ? "Đang lưu..." : "Lưu"}</Text>
              </Pressable>
            </View>
          </View>
    </KeyboardSafeModalFrame>
  );
}

export default function GroupAboutTab({
  token,
  groupId,
  group,
  isOwner,
  onUpdated,
  onModalOverlayChange,
}: {
  token: string;
  groupId: string;
  group: Group;
  isOwner: boolean;
  onUpdated?: () => Promise<void> | void;
  onModalOverlayChange?: (node: React.ReactNode | null) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [busyGroupSave, setBusyGroupSave] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name || "");
  const [descDraft, setDescDraft] = useState(group.description || "");
  const [visDraft, setVisDraft] = useState<Group["visibility"]>(group.visibility);

  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busyEdit, setBusyEdit] = useState(false);

  useEffect(() => {
    setNameDraft(group.name || "");
    setDescDraft(group.description || "");
    setVisDraft(group.visibility);
  }, [group.id, group.name, group.description, group.visibility]);

  const reloadPosts = useCallback(async () => {
    if (!token || !groupId) return;
    setErr(null);
    setLoading(true);
    try {
      const items = await fetchGroupPosts(token, groupId);
      setPosts(items || []);
    } catch (e: any) {
      setErr(e?.message || "Load posts error");
    } finally {
      setLoading(false);
    }
  }, [groupId, token]);

  useEffect(() => {
    reloadPosts();
  }, [reloadPosts]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [posts]);

  const onSaveGroup = useCallback(async () => {
    const name = nameDraft.trim();
    if (!name) return Alert.alert("Thiếu tên", "Tên nhóm không được rỗng.");
    setBusyGroupSave(true);
    try {
      await updateGroup(token, groupId, {
        name,
        description: descDraft,
        visibility: visDraft,
      });
      setGroupModalOpen(false);
      await onUpdated?.();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không cập nhật được nhóm");
    } finally {
      setBusyGroupSave(false);
    }
  }, [descDraft, groupId, nameDraft, onUpdated, token, visDraft]);

  const onCreatePost = useCallback(async () => {
    const content = createText.trim();
    if (!content) return Alert.alert("Thiếu nội dung", "Nhập nội dung bài viết.");

    setBusyCreate(true);
    try {
      await createGroupPost(token, groupId, { content });
      setCreateText("");
      setCreateOpen(false);
      await reloadPosts();
      await onUpdated?.();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không tạo được bài viết");
    } finally {
      setBusyCreate(false);
    }
  }, [createText, groupId, onUpdated, reloadPosts, token]);

  const onSaveEditPost = useCallback(async () => {
    if (!editingPostId) return;
    const content = editText.trim();
    if (!content) return Alert.alert("Thiếu nội dung", "Nhập nội dung bài viết.");

    setBusyEdit(true);
    try {
      await updateGroupPost(token, groupId, editingPostId, { content });
      setEditOpen(false);
      setEditingPostId(null);
      setEditText("");
      await reloadPosts();
      await onUpdated?.();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không cập nhật được bài viết");
    } finally {
      setBusyEdit(false);
    }
  }, [editText, editingPostId, groupId, onUpdated, reloadPosts, token]);

  const modalOverlay = (
    <>
      <EditGroupModal
        open={groupModalOpen}
        busy={busyGroupSave}
        name={nameDraft}
        description={descDraft}
        visibility={visDraft}
        onClose={() => setGroupModalOpen(false)}
        onChangeName={setNameDraft}
        onChangeDescription={setDescDraft}
        onChangeVisibility={setVisDraft}
        onSave={onSaveGroup}
      />

      <InputModal
        title="Tạo bài viết"
        open={createOpen}
        busy={busyCreate}
        value={createText}
        onChange={setCreateText}
        onClose={() => {
          setCreateOpen(false);
          setCreateText("");
        }}
        onSave={onCreatePost}
      />

      <InputModal
        title="Sửa bài viết"
        open={editOpen}
        busy={busyEdit}
        value={editText}
        onChange={setEditText}
        onClose={() => {
          setEditOpen(false);
          setEditingPostId(null);
          setEditText("");
        }}
        onSave={onSaveEditPost}
      />
    </>
  );

  useEffect(() => {
    if (!onModalOverlayChange) return;

    onModalOverlayChange(modalOverlay);
    return () => onModalOverlayChange(null);
  }, [
    busyCreate,
    busyEdit,
    busyGroupSave,
    createOpen,
    createText,
    descDraft,
    editOpen,
    editText,
    groupModalOpen,
    nameDraft,
    onCreatePost,
    onModalOverlayChange,
    onSaveEditPost,
    onSaveGroup,
    visDraft,
  ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 24}
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <SectionTitle icon="information-circle-outline" title="Thông tin nhóm" />
        <Card>
          <View style={{ padding: 14 }}>
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
            <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
              <Pill label={group.visibility === "public" ? "Public" : "Private"} />
            </View>
            {isOwner ? (
              <Pressable
                onPress={() => setGroupModalOpen(true)}
                style={{
                  marginTop: 12,
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: SKY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="pencil" size={18} color="white" />
              </Pressable>
            ) : null}
          </View>
        </Card>

        <View style={{ height: 14 }} />
        <SectionTitle
          icon="newspaper-outline"
          title="Bài viết"
          right={
            isOwner ? (
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  backgroundColor: SKY,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={18} color="white" />
              </Pressable>
            ) : null
          }
        />

        {err ? (
          <Card>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 12, color: "#B91C1C" }}>{err}</Text>
              <Pressable
                onPress={reloadPosts}
                style={{
                  marginTop: 10,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: SKY,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Tải lại</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {!err && loading ? (
          <Card>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Đang tải bài viết...</Text>
            </View>
          </Card>
        ) : null}

        {!err && !loading ? (
          <>
            {sortedPosts.length === 0 ? (
              <Card>
                <View style={{ padding: 12 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Chưa có bài viết nào.</Text>
                </View>
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {sortedPosts.map((post) => (
                  <Card key={post.id}>
                    <View style={{ padding: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          Cập nhật: {formatDate(post.updatedAt)}
                        </Text>
                        {isOwner ? (
                          <Pressable
                            onPress={() => {
                              setEditingPostId(post.id);
                              setEditText(post.content || "");
                              setEditOpen(true);
                            }}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: SKY,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons name="pencil" size={16} color="white" />
                          </Pressable>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 14, color: "#111827", lineHeight: 20 }}>
                        {post.content || "-"}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : null}
      </View>

      {onModalOverlayChange ? null : modalOverlay}
    </KeyboardAvoidingView>
  );
}
