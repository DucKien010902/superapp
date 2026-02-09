import * as Crypto from "expo-crypto";
import { db } from "./db";
import { initNoteDb } from "./init";
import type { Folder, Note, SortKey } from "./types";
import { makePreview, nowIso } from "./ultils";
initNoteDb();


function sortSql(sort: SortKey) {
  switch (sort) {
    case "updated_asc":
      return `ORDER BY pinned DESC, updatedAt ASC`;
    case "title_asc":
      return `ORDER BY pinned DESC, title COLLATE NOCASE ASC, updatedAt DESC`;
    case "title_desc":
      return `ORDER BY pinned DESC, title COLLATE NOCASE DESC, updatedAt DESC`;
    case "updated_desc":
    default:
      return `ORDER BY pinned DESC, updatedAt DESC`;
  }
}

export const NoteRepo = {
  // ----- folders -----
  listFolders(): Folder[] {
    return db.getAllSync<Folder>(
      `SELECT * FROM folders WHERE isSystem=0 ORDER BY "order" ASC, updatedAt DESC`
    );
  },

  getFolder(id: string): Folder | null {
    return (
      db.getFirstSync<Folder>(`SELECT * FROM folders WHERE id=?`, [id]) ?? null
    );
  },

  createFolder(name: string) {
    const id = Crypto.randomUUID();
    const now = nowIso();
    db.runSync(
      `INSERT INTO folders (id, name, "order", isSystem, createdAt, updatedAt)
       VALUES (?, ?, 0, 0, ?, ?)`,
      [id, name.trim(), now, now]
    );
    return id;
  },

  renameFolder(id: string, name: string) {
    db.runSync(`UPDATE folders SET name=?, updatedAt=? WHERE id=?`, [
      name.trim(),
      nowIso(),
      id,
    ]);
  },

  deleteFolder(id: string) {
    // chuyển note về null folder, không xoá note
    db.runSync(`UPDATE notes SET folderId=NULL, updatedAt=? WHERE folderId=?`, [
      nowIso(),
      id,
    ]);
    db.runSync(`DELETE FROM folders WHERE id=? AND isSystem=0`, [id]);
  },

  // ----- notes -----
  listNotes(params: {
    folderId?: string | null;
    includeDeleted?: boolean;
    sort?: SortKey;
  }): Note[] {
    const { folderId = undefined, includeDeleted = false, sort = "updated_desc" } = params;

    const whereDeleted = includeDeleted ? `1=1` : `deletedAt IS NULL`;
    if (folderId === undefined) {
      return db.getAllSync<Note>(`SELECT * FROM notes WHERE ${whereDeleted} ${sortSql(sort)}`);
    }
    if (folderId === null) {
      return db.getAllSync<Note>(`SELECT * FROM notes WHERE ${whereDeleted} AND folderId IS NULL ${sortSql(sort)}`);
    }
    return db.getAllSync<Note>(
      `SELECT * FROM notes WHERE ${whereDeleted} AND folderId=? ${sortSql(sort)}`,
      [folderId]
    );
  },

  getNote(id: string): Note | null {
    return db.getFirstSync<Note>(`SELECT * FROM notes WHERE id=?`, [id]) ?? null;
  },

  createNote(input: { folderId?: string | null; title?: string; content?: string }) {
    const id = Crypto.randomUUID();
    const now = nowIso();
    const title = (input.title ?? "").trim();
    const content = input.content ?? "";
    const preview = makePreview(title, content);

    db.runSync(
      `INSERT INTO notes (id, folderId, title, content, preview, pinned, createdAt, updatedAt, deletedAt, color)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, NULL)`,
      [id, input.folderId ?? null, title, content, preview, now, now]
    );
    return id;
  },

  updateNote(id: string, patch: { title?: string; content?: string; folderId?: string | null }) {
    const current = this.getNote(id);
    const title = (patch.title ?? current?.title ?? "").trim();
    const content = patch.content ?? current?.content ?? "";
    const preview = makePreview(title, content);

    db.runSync(
      `UPDATE notes
       SET title=?, content=?, preview=?, folderId=COALESCE(?, folderId), updatedAt=?
       WHERE id=?`,
      [title, content, preview, patch.folderId ?? null, nowIso(), id]
    );
  },

  togglePin(id: string) {
    db.runSync(
      `UPDATE notes
       SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END,
           updatedAt=?
       WHERE id=?`,
      [nowIso(), id]
    );
  },

  moveToTrash(id: string) {
    const now = nowIso();
    db.runSync(`UPDATE notes SET deletedAt=?, updatedAt=? WHERE id=?`, [now, now, id]);
  },

  listTrash(sort: SortKey = "updated_desc") {
    return db.getAllSync<Note>(
      `SELECT * FROM notes WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC`
    );
  },

  restoreFromTrash(id: string) {
    db.runSync(`UPDATE notes SET deletedAt=NULL, updatedAt=? WHERE id=?`, [nowIso(), id]);
  },

  deleteForever(id: string) {
    db.runSync(`DELETE FROM notes WHERE id=?`, [id]);
  },

  search(q: string, sort: SortKey = "updated_desc") {
    const s = `%${q.trim()}%`;
    return db.getAllSync<Note>(
      `SELECT * FROM notes
       WHERE deletedAt IS NULL AND (title LIKE ? OR content LIKE ?)
       ${sortSql(sort)}`,
      [s, s]
    );
  },

  countAllNotes() {
    const r = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) as c FROM notes WHERE deletedAt IS NULL`);
    return r?.c ?? 0;
  },
};
