import { migrateNoteDb } from "./migrate";

let inited = false;

export function initNoteDb() {
  if (inited) return;
  migrateNoteDb();
  inited = true;
}
