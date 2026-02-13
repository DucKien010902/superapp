import { migrateNoteDb } from "@/lib/note/migrate";
import { Stack } from "expo-router";
import React, { useEffect } from "react";

export default function NoteLayout() {
  useEffect(() => {
    migrateNoteDb();
  }, []);

  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
