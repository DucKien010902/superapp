export type Folder = {
  id: string;
  name: string;
  order: number;
  isSystem: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  preview: string;
  pinned: 0 | 1;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SortKey = "updated_desc" | "updated_asc" | "title_asc" | "title_desc";
