import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

// Pluggable blob storage for uploaded images.
//
// The default adapter writes to `.uploads/` and serves files back through the
// `/media/[name]` route handler — works in local dev, the desktop build, and any
// Node host with a writable disk. (Next doesn't serve files written to `public/`
// at runtime, hence the route.) On serverless (Vercel) the filesystem is
// ephemeral/read-only, so swap in a Supabase Storage or S3 adapter there (same
// `saveImage` contract):
//
//   const { data } = await supabase.storage.from("uploads").upload(key, buf);
//   return supabase.storage.from("uploads").getPublicUrl(key).data.publicUrl;

export const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

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
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
  return { url: `/media/${name}` };
}
