import { readImage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  // Only simple filenames are valid keys.
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const image = await readImage(name);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.data, {
    headers: {
      "Content-Type": image.mime,
      // Keys are content-unique (timestamp + random), safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
