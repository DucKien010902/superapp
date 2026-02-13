import { NoteRepo } from "@/lib/note/repo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

export default function CreateNoteScreen() {
  const router = useRouter();
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();

  useEffect(() => {
    const id = NoteRepo.createNote({
      folderId: folderId ? String(folderId) : null,
    });
    router.replace(`/note/note/${id}`);
  }, []);

  return null;
}
