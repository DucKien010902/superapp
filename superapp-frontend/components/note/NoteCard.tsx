import type { Note } from "@/lib/note/types";
import { format } from "date-fns";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NoteCard({
  note,
  onPress,
  onLongPress,
}: {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const date = note.updatedAt ? format(new Date(note.updatedAt), "dd/MM") : "";
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.card}>
      <View style={styles.topRow}>
        {note.pinned ? (
          <Text style={styles.pin}>📌</Text>
        ) : (
          <Text style={styles.pinGhost}> </Text>
        )}
        <Text style={styles.date}>{date}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {note.title?.trim() ? note.title : "Ghi chú"}
      </Text>
      <Text style={styles.desc} numberOfLines={6}>
        {note.preview?.trim() ? note.preview : note.content}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 140,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pin: { fontSize: 14 },
  pinGhost: { fontSize: 14, opacity: 0 },
  date: { color: "rgba(255,255,255,0.55)", fontWeight: "800" },
  title: { color: "white", fontSize: 14, fontWeight: "900" },
  desc: {
    marginTop: 8,
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    lineHeight: 16,
  },
});
