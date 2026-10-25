import "server-only";
import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

let client: S3Client | undefined;

function s3Client() {
  if (client) return client;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("S3-compatible storage is not configured.");
  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

const types = {
  "image/jpeg": { ext: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { ext: "png", signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/webp": { ext: "webp", signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" },
} as const;

export async function saveProductImage(file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("Image must be smaller than 8 MB.");
  const mediaType = file.type as keyof typeof types;
  const type = types[mediaType];
  if (!type) throw new Error("Only JPEG, PNG, and WebP images are accepted.");
  const body = new Uint8Array(await file.arrayBuffer());
  if (!type.signature(body)) throw new Error("Image content does not match its file type.");
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is required.");
  const s3 = s3Client();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try { await s3.send(new CreateBucketCommand({ Bucket: bucket })); }
    catch (error) {
      if (!(error instanceof Error) || !/BucketAlreadyOwnedByYou|BucketAlreadyExists/.test(error.name)) throw error;
    }
  }
  const key = `products/${randomUUID()}.${type.ext}`;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: mediaType, CacheControl: "public, max-age=31536000, immutable" }));
  return { key, url: `/api/media/${key.split("/").map(encodeURIComponent).join("/")}` };
}

export async function readProductImage(key: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !/^products\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(key)) return null;
  const result = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body || !result.ContentType?.startsWith("image/")) return null;
  return { body: result.Body.transformToWebStream(), contentType: result.ContentType };
}

export async function deleteProductImage(key: string) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket || !/^products\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(key)) return;
  await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
