import ConfirmDialog from "@/components/note/ConfirmDialog";
import ScreenNote from "@/components/ScreenNote";
import { NoteRepo } from "@/lib/note/repo";
import type { Note } from "@/lib/note/types";
import * as Haptics from "expo-haptics";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function NoteEditorScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // ✅ bypass beforeRemove khi đã quyết định thoát
  const allowLeaveRef = useRef(false);

  // ✅ lưu action back/gesture bị chặn để dispatch lại cho "thoát 1 phát"
  const pendingActionRef = useRef<any>(null);

  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = String(id);

  // ✅ quy ước: màn tạo mới thường có id="create"
  const isCreate = noteId === "create";

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // snapshot để biết dirty (đối với edit)
  const initialRef = useRef<{ title: string; content: string } | null>(null);

  const [trashConfirm, setTrashConfirm] = useState(false);

  const load = useCallback(() => {
    allowLeaveRef.current = false; // ✅ vào lại màn thì reset
    pendingActionRef.current = null;

    if (isCreate) {
      // ✅ tạo mới: không load note từ repo, để form trống
      setNote({ id: "create" as any } as Note);
      setTitle("");
      setContent("");
      initialRef.current = { title: "", content: "" };
      return;
    }

    const n = NoteRepo.getNote(noteId);
    setNote(n);

    const t = n?.title ?? "";
    const c = n?.content ?? "";
    setTitle(t);
    setContent(c);
    initialRef.current = { title: t, content: c };
  }, [noteId, isCreate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isDeleted = !!note?.deletedAt;

  const topTitle = useMemo(() => {
    if (isDeleted) return "Ghi chú (Thùng rác)";
    if (isCreate) return "Ghi chú mới";
    return "Ghi chú";
  }, [isDeleted, isCreate]);

  const hasAnyText = useMemo(() => {
    return (title ?? "").trim().length > 0 || (content ?? "").trim().length > 0;
  }, [title, content]);

  const isDirty = useMemo(() => {
    if (isDeleted) return false;

    // ✅ create: dirty khi có gõ gì đó
    if (isCreate) return hasAnyText;

    const init = initialRef.current;
    if (!init) return false;
    return init.title !== title || init.content !== content;
  }, [title, content, isDeleted, isCreate, hasAnyText]);

  const save = useCallback(async () => {
    if (isDeleted) return;

    // ✅ create mà trống -> không lưu, không tạo
    if (isCreate && !hasAnyText) {
      await Haptics.selectionAsync();
      return;
    }

    await Haptics.selectionAsync();

    if (isCreate) {
      // ✅ tạm dùng any nếu repo chưa typed createNote
      const created = (NoteRepo as any).createNote({ title, content }) as Note;

      // cập nhật snapshot theo note mới
      initialRef.current = {
        title: created?.title ?? "",
        content: created?.content ?? "",
      };
      setNote(created);
      return;
    }

    NoteRepo.updateNote(noteId, { title, content });
    const n2 = NoteRepo.getNote(noteId);
    setNote(n2);
    initialRef.current = { title, content };
  }, [noteId, title, content, isDeleted, isCreate, hasAnyText]);

  // ✅ thoát đúng 1 phát: dispatch lại action back/gesture đã bị chặn
  const leaveNow = useCallback(() => {
    allowLeaveRef.current = true;

    if (pendingActionRef.current) {
      navigation.dispatch(pendingActionRef.current);
      pendingActionRef.current = null;
      return;
    }

    // fallback khi bấm nút ← trong UI
    router.back();
  }, [navigation, router]);

  const exitWithoutSave = useCallback(() => {
    // ✅ create: không tạo note, thoát luôn
    if (isCreate) {
      leaveNow();
      return;
    }

    // ✅ edit: revert về snapshot (bỏ thay đổi) rồi thoát
    const init = initialRef.current;
    if (init) {
      setTitle(init.title);
      setContent(init.content);
    }
    leaveNow();
  }, [isCreate, leaveNow]);

  const showLeavePrompt = useCallback(() => {
    // ✅ create + trống: thoát luôn, khỏi hỏi
    if (isCreate && !hasAnyText) {
      leaveNow();
      return;
    }

    // ✅ nếu không dirty: thoát luôn
    if (!isDirty) {
      leaveNow();
      return;
    }

    Alert.alert(
      "Bạn chưa lưu",
      "Thoát bây giờ sẽ mất thay đổi. Bạn muốn làm gì?",
      [
        { text: "Ở lại", style: "cancel" },
        {
          text: "Không lưu",
          style: "destructive",
          onPress: exitWithoutSave,
        },
        {
          text: "Lưu & thoát",
          onPress: async () => {
            await save();
            leaveNow();
          },
        },
      ],
    );
  }, [isCreate, hasAnyText, isDirty, leaveNow, exitWithoutSave, save]);

  // ✅ chặn mọi hành động rời màn (Android back, iOS swipe, router.back...)
  React.useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current) return;

      // ✅ create trống: cho thoát luôn (không hỏi)
      if (isCreate && !hasAnyText) return;

      // ✅ không dirty: cho thoát
      if (!isDirty) return;

      // ✅ dirty: chặn và hỏi
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      showLeavePrompt();
    });

    return unsub;
  }, [navigation, isDirty, showLeavePrompt, isCreate, hasAnyText]);

  if (!note) {
    return (
      <View
        style={[
          styles.loading,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: "rgba(255,255,255,0.7)" }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScreenNote
      style={styles.screen}
      contentStyle={{ backgroundColor: "#070A12" }}
    >
      {/* confirm thùng rác */}
      <ConfirmDialog
        open={trashConfirm}
        title={isDeleted ? "Xoá vĩnh viễn?" : "Chuyển vào thùng rác?"}
        desc={
          isDeleted
            ? "Không thể hoàn tác."
            : "Bạn có thể khôi phục trong Thùng rác."
        }
        okText={isDeleted ? "Xoá" : "Chuyển"}
        danger={isDeleted}
        onCancel={() => setTrashConfirm(false)}
        onOk={() => {
          setTrashConfirm(false);
          if (isDeleted) {
            if (!isCreate) NoteRepo.deleteForever(noteId);
            leaveNow();
          } else {
            if (!isCreate) NoteRepo.moveToTrash(noteId);
            leaveNow();
          }
        }}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={showLeavePrompt} style={styles.iconBtn}>
          <Text style={styles.icon}>←</Text>
        </Pressable>

        <Text style={styles.hTitle}>{topTitle}</Text>

        <Pressable
          onPress={async () => {
            if (isDeleted || isCreate) return;
            await Haptics.selectionAsync();
            NoteRepo.togglePin(noteId);
            setNote(NoteRepo.getNote(noteId));
          }}
          style={styles.iconBtn}
        >
          <Text style={styles.icon}>{(note as any)?.pinned ? "📌" : "📍"}</Text>
        </Pressable>

        <Pressable onPress={() => setTrashConfirm(true)} style={styles.iconBtn}>
          <Text style={styles.icon}>🗑</Text>
        </Pressable>
      </View>

      {/* INPUTS */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Tiêu đề"
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.titleInput}
        editable={!isDeleted}
      />

      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Nhập nội dung..."
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.contentInput}
        multiline
        textAlignVertical="top"
        editable={!isDeleted}
      />

      {/* bạn đang comment action bar => giữ nguyên */}
      <View style={styles.bottomBar}>
        <Text style={styles.hint}>
          {isDeleted
            ? "Ghi chú trong thùng rác (chỉ xem)"
            : isCreate
              ? hasAnyText
                ? "Chưa lưu"
                : "Chưa nhập gì"
              : isDirty
                ? "Chưa lưu"
                : "Đã lưu"}
        </Text>
      </View>
    </ScreenNote>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#070A12" },
  loading: { flex: 1, backgroundColor: "#070A12" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  hTitle: { flex: 1, color: "white", fontSize: 16, fontWeight: "900" },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  icon: { color: "white", fontSize: 16, fontWeight: "900" },

  titleInput: {
    marginHorizontal: 16,
    marginTop: 6,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  contentInput: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    lineHeight: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    maxHeight: 320,
    minHeight: 180,
  },

  bottomBar: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hint: {
    flex: 1,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
  },
});
