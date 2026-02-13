export const nowIso = () => new Date().toISOString();

export function makePreview(title: string, content: string) {
  const t = title?.trim() ? title.trim() + "\n" : "";
  return (t + (content ?? "")).replace(/\s+/g, " ").trim().slice(0, 180);
}
