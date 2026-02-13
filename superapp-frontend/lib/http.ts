const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:4000"; // emulator default

export async function http<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    // trả luôn text từ backend cho dễ debug
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // nếu backend trả plain text
    return text as unknown as T;
  }
}
