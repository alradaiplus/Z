import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";

// Blob storage for uploaded images, backed by the database (ImageAsset table)
// and served through the `/media/[name]` route handler.
//
// Why the DB and not disk: on serverless hosts (Vercel) the filesystem is
// read-only/ephemeral, so files written at runtime 500 or silently vanish
// between invocations. The database is the one durable store the app already
// has on every host (SQLite in dev, Postgres in production). At the 10MB/image
// cap this is fine for a notes app; swap `saveImage`/`readImage` for a
// Supabase Storage or S3 adapter if uploads ever outgrow it.

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export function isAllowedImage(mime: string): boolean {
  return mime in EXT_BY_MIME;
}

/**
 * Persist an image and return a public URL. Throws on unsupported type / size.
 */
export async function saveImage(
  bytes: Buffer,
  mime: string,
): Promise<{ url: string }> {
  if (!isAllowedImage(mime)) throw new Error("Unsupported image type");
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image too large (max 10MB)");

  const ext = EXT_BY_MIME[mime];
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await prisma.imageAsset.create({
    data: { name, mime, data: Uint8Array.from(bytes) },
  });
  return { url: `/media/${name}` };
}

/**
 * Look up a stored image by its URL key. Returns null when unknown.
 */
export async function readImage(
  name: string,
): Promise<{ mime: string; data: Uint8Array<ArrayBuffer> } | null> {
  const asset = await prisma.imageAsset.findUnique({ where: { name } });
  if (!asset) return null;
  return { mime: asset.mime, data: Uint8Array.from(asset.data) };
}
