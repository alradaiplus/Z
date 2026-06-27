"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { pmToMarkdown } from "@/lib/markdown";
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
 * Writes to ./vault by default. In the Tauri desktop build this runs against the
 * user's local filesystem, giving a real on-disk vault.
 */
export async function exportVault(): Promise<{ dir: string; count: number }> {
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
    // Build nested folders from ancestor titles.
    const parts: string[] = [];
    let current = page.parentId ? byId.get(page.parentId) : undefined;
    let guard = 0;
    while (current && guard++ < 50) {
      parts.unshift(slugify(current.title));
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.join(path.sep);
  };

  const root = path.join(process.cwd(), "vault");
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });

  let count = 0;
  for (const page of pages) {
    const dir = path.join(root, folderFor(page));
    await fs.mkdir(dir, { recursive: true });

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

    await fs.writeFile(
      path.join(dir, `${slugify(page.title)}.md`),
      frontmatter + body,
      "utf8",
    );
    count++;
  }

  return { dir: root, count };
}
