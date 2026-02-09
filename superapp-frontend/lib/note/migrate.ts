import * as Crypto from "expo-crypto";
import { db } from "./db";
import { nowIso } from "./ultils";

export function migrateNoteDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      isSystem INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      folderId TEXT,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      preview TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      color TEXT,
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folderId);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deletedAt);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
  `);

  // seed default folder
  const r = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) as c FROM folders WHERE isSystem=0`
  );
  if (!r || r.c === 0) {
    const now = nowIso();
    db.runSync(
      `INSERT INTO folders (id, name, "order", isSystem, createdAt, updatedAt)
       VALUES (?, ?, 0, 0, ?, ?)`,
      Crypto.randomUUID(), "Thư mục 1", now, now
    );
  }
}
