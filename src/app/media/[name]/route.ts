import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // Guard against path traversal — only simple filenames are valid.
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
