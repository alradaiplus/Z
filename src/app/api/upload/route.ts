import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveImage, isAllowedImage, MAX_IMAGE_BYTES } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!isAllowedImage(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 415 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const { url } = await saveImage(bytes, file.type);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
