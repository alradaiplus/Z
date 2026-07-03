"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { resolveAllLinks } from "@/lib/workspace";
import { markdownToPm } from "@/lib/markdown-import";
import { pmToMarkdown } from "@/lib/markdown";
import { unzip } from "@/lib/unzip";
import { LIMITS } from "@/lib/validation";

const MAX_FILES = 5_000;

type Entry = { segments: string[]; markdown: string };

// "My Note abc123…32hex.md" (Notion) -> "My Note"
function cleanName(segment: string): string {
  return (
    segment
      .replace(/\.(md|markdown)$/i, "")
      .replace(/\s+[0-9a-f]{32}$/i, "")
      .trim() || "Untitled"
  );
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/**
 * Import Markdown notes into the workspace. Accepts individual `.md`/`.markdown`
 * files and/or `.zip` exports (Notion, or a zipped Obsidian vault). Folder
 * structure becomes nested pages; [[wikilinks]] are resolved after import.
 * Returns the number of pages created.
 */
export async function importFiles(
  formData: FormData,
): Promise<{ count: number; error?: string }> {
  const workspaceId = await getActiveWorkspaceId();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  const entries: Entry[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const buf = Buffer.from(await file.arrayBuffer());
      for (const f of unzip(buf)) {
        if (/\.(md|markdown)$/i.test(f.name)) {
          entries.push({
            segments: f.name.split("/").filter(Boolean),
            markdown: f.content.toString("utf8").slice(0, LIMITS.content),
          });
        }
      }
    } else if (/\.(md|markdown)$/i.test(file.name)) {
      entries.push({
        segments: file.name.split("/").filter(Boolean),
        markdown: (await file.text()).slice(0, LIMITS.content),
      });
    }
    if (entries.length > MAX_FILES) {
      return { count: 0, error: `Too many files (max ${MAX_FILES}).` };
    }
  }

  if (entries.length === 0) {
    return { count: 0, error: "No .md files found in the upload." };
  }

  // Lazily create folder pages, caching by joined path.
  const folderId = new Map<string, string>();
  const orderByParent = new Map<string, number>();

  const nextOrder = async (parentId: string | null): Promise<number> => {
    const key = parentId ?? "__root__";
    if (!orderByParent.has(key)) {
      const existing = await prisma.page.count({
        where: { workspaceId, parentId: parentId ?? null },
      });
      orderByParent.set(key, existing);
    }
    const n = orderByParent.get(key)!;
    orderByParent.set(key, n + 1);
    return n;
  };

  const ensureFolder = async (parts: string[]): Promise<string | null> => {
    if (parts.length === 0) return null;
    const key = parts.join("/");
    const cached = folderId.get(key);
    if (cached) return cached;
    const parentId = await ensureFolder(parts.slice(0, -1));
    const page = await prisma.page.create({
      data: {
        workspaceId,
        parentId,
        title: cleanName(parts[parts.length - 1]),
        order: await nextOrder(parentId),
      },
    });
    folderId.set(key, page.id);
    return page.id;
  };

  let count = 0;
  for (const entry of entries) {
    const segments = [...entry.segments];
    const fileSeg = segments.pop()!;
    const parentId = await ensureFolder(segments);
    const doc = markdownToPm(stripFrontmatter(entry.markdown));
    await prisma.page.create({
      data: {
        workspaceId,
        parentId,
        type: "doc",
        title: cleanName(fileSeg),
        content: JSON.stringify(doc),
        markdown: pmToMarkdown(doc),
        order: await nextOrder(parentId),
      },
    });
    count++;
  }

  // Wire up [[wikilinks]] across the whole workspace now that pages exist.
  await resolveAllLinks(workspaceId);
  revalidatePath("/app", "layout");
  return { count };
}
