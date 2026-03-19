import { http } from "@/lib/http";

export async function fetchLatestVersion(token: string) {
  return http<any>("/api/version/latest", token);
}

export async function createNewVersion(token: string, payload: { versionCode: string, downloadUrl: string }) {
  return http<any>("/api/version", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function markVersionAsViewed(token: string, versionCode: string) {
  return http<any>("/api/version/viewed", token, {
    method: "PATCH",
    body: JSON.stringify({ versionCode })
  });
}