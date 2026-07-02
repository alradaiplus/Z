"use server";

import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { pmToMarkdown } from "@/lib/markdown";
import { createZip, type ZipEntry } from "@/lib/zip";
import {
  parseProperties,
  parseRows,
  type CellValue,
  type DbProperty,
} from "@/lib/database";

function slugify(title: string): string {
  return (
    title
      .trim()
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "Untitled"
  );
}

function cellToText(prop: DbProperty, value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (prop.type === "select") {
    return prop.options.find((o) => o.id === value)?.name ?? "";
  }
  if (prop.type === "checkbox") return value ? "✓" : "";
  return String(value);
}

function databaseToMarkdown(
  properties: DbProperty[],
  rows: { cells: Record<string, CellValue> }[],
): string {
  if (properties.length === 0) return "_Empty database._";
  const header = `| ${properties.map((p) => p.name).join(" | ")} |`;
  const sep = `| ${properties.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (r) =>
        `| ${properties
          .map((p) => cellToText(p, r.cells[p.id] ?? null).replace(/\|/g, "\\|"))
          .join(" | ")} |`,
    )
    .join("\n");
  return [header, sep, body].join("\n");
}

/**
 * Export the entire workspace to an Obsidian-style folder of Markdown files,
 * preserving the page hierarchy as nested folders. Doc pages export their
 * content; database pages export a Markdown table. Tags become YAML frontmatter.
 *
 * Returns a base64-encoded ZIP the browser downloads — works on serverless
 * (Vercel) and in the desktop build alike.
 */
export async function exportVault(): Promise<{
  filename: string;
  base64: string;
  count: number;
}> {
  const workspaceId = await getActiveWorkspaceId();

  const pages = await prisma.page.findMany({
    where: { workspaceId, archivedAt: null },
    select: {
      id: true,
      parentId: true,
      type: true,
      title: true,
      content: true,
      tags: { select: { tag: { select: { name: true } } } },
      database: {
        select: {
          properties: true,
          rows: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  const byId = new Map(pages.map((p) => [p.id, p]));
  const folderFor = (page: (typeof pages)[number]): string => {
    // Build nested folders from ancestor titles (forward slashes for ZIP paths).
    const parts: string[] = [];
    let current = page.parentId ? byId.get(page.parentId) : undefined;
    let guard = 0;
    while (current && guard++ < 50) {
      parts.unshift(slugify(current.title));
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.length ? parts.join("/") + "/" : "";
  };

  const seenNames = new Map<string, number>();
  const entries: ZipEntry[] = pages.map((page) => {
    const tags = page.tags.map((t) => t.tag.name);
    const frontmatter =
      `---\ntitle: ${page.title}\n` +
      (tags.length ? `tags: [${tags.join(", ")}]\n` : "") +
      `---\n\n`;

    let body: string;
    if (page.type === "database" && page.database) {
      const props = parseProperties(page.database.properties);
      const rows = parseRows(page.database.rows);
      body = `# ${page.title}\n\n${databaseToMarkdown(props, rows)}\n`;
    } else {
      // Doc content usually already opens with its own H1; the title also lives
      // in the frontmatter, so don't prepend a duplicate heading.
      const md = pmToMarkdown(page.content);
      body = md.startsWith("# ") ? `${md}\n` : `# ${page.title}\n\n${md}\n`;
    }

    // Ensure unique file paths (sibling pages can share a title).
    let name = `${folderFor(page)}${slugify(page.title)}`;
    const n = seenNames.get(name) ?? 0;
    seenNames.set(name, n + 1);
    if (n > 0) name = `${name} (${n})`;

    return { name: `${name}.md`, content: frontmatter + body };
  });

  const zip = createZip(entries);
  return {
    filename: "z-vault.zip",
    base64: zip.toString("base64"),
    count: entries.length,
  };
}
