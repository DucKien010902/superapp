import * as Minio from "minio";

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "superapp";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "minio-server";
const MINIO_PORT = Number(process.env.MINIO_PORT || 9000);
const MINIO_USE_SSL = String(process.env.MINIO_USE_SSL || "false") === "true";

export const MINIO_PUBLIC_URL = (process.env.URL_MINIO || "https://file.gennovax.vn").replace(
  /\/+$/,
  ""
);

export const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const publicReadPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
    },
  ],
};

export async function initMinioBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET);
      console.log(`MinIO bucket created: ${MINIO_BUCKET}`);
    }

    await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(publicReadPolicy));
    console.log(`MinIO bucket ready: ${MINIO_BUCKET}`);
  } catch (error) {
    console.error("MinIO bucket setup error:", error);
  }
}

export function buildPublicMinioUrl(objectName) {
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${objectName
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function getObjectNameFromPublicUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    const prefix = `/${MINIO_BUCKET}/`;
    const index = parsed.pathname.indexOf(prefix);
    if (index === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(index + prefix.length));
  } catch {
    return "";
  }
}
