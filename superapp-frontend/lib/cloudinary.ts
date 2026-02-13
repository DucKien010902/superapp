// lib/cloudinary.ts
export const CLOUDINARY_CLOUD_NAME = "da6f4dmql";
export const CLOUDINARY_UPLOAD_PRESET = "supperapp_unsigned_upload";

type UploadResult = { secure_url: string };

export async function uploadImageToCloudinary(
  fileUri: string,
): Promise<string> {
  const form = new FormData();

  // RN/Expo: phải gửi đúng kiểu { uri, name, type }
  const filename = fileUri.split("/").pop() || `image_${Date.now()}.jpg`;
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  const mime = ext === "png" ? "image/png" : "image/jpeg";

  form.append("file", {
    uri: fileUri,
    name: filename,
    type: mime,
  } as any);

  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Cloudinary upload failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as UploadResult;
  return data.secure_url;
}
