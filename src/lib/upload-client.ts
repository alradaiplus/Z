// Client helper: upload an image file to /api/upload and return its URL.
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

/** Open a native file picker for a single image and resolve the chosen file. */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
      cleanup();
    };
    // If the dialog is cancelled, resolve null so we don't leak the input.
    input.oncancel = () => {
      resolve(null);
      cleanup();
    };
    input.click();
  });
}
