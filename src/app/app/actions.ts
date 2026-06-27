"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { pmToMarkdown } from "@/lib/markdown";
import { normalizeTitle } from "@/lib/wikilinks";
import {
  bootstrapWorkspace,
  resolveLinksForPage,
  resolveAllLinks,
} from "@/lib/workspace";

/**
 * Resolve the active workspace for the current user, bootstrapping one if the
 * account somehow has none. Phase 1 uses a single workspace per user.
 */
export async function getActiveWorkspaceId(): Promise<string> {
  const session = await requireSession();
  const workspace = await prisma.workspace.findFirst({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (workspace) return workspace.id;
  const { workspaceId } = await bootstrapWorkspace(session.userId);
  return workspaceId;
}

async function assertPageInWorkspace(pageId: string, workspaceId: string) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: { id: true },
  });
  if (!page) throw new Error("Page not found");
}

export async function createPage(parentId?: string | null): Promise<string> {
  const workspaceId = await getActiveWorkspaceId();
  if (parentId) await assertPageInWorkspace(parentId, workspaceId);

  const siblingCount = await prisma.page.count({
    where: { workspaceId, parentId: parentId ?? null, archivedAt: null },
  });

  const page = await prisma.page.create({
    data: {
      workspaceId,
      parentId: parentId ?? null,
      title: "Untitled",
      content: "",
      markdown: "",
      order: siblingCount,
    },
  });

  revalidatePath("/app", "layout");
  return page.id;
}

export async function renamePage(pageId: string, title: string): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);

  await prisma.page.update({
    where: { id: pageId },
    data: { title: title.trim() || "Untitled" },
  });

  // A rename can resolve previously dangling wikilinks across the workspace.
  await resolveAllLinks(workspaceId);
  revalidatePath("/app", "layout");
}

export async function updatePageIcon(
  pageId: string,
  icon: string | null,
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);
  await prisma.page.update({ where: { id: pageId }, data: { icon } });
  revalidatePath("/app", "layout");
}

/**
 * Persist editor content. Returns the ISO timestamp of the save so the client
 * can show "saved" status. This is the core sync write path.
 */
export async function savePageContent(
  pageId: string,
  contentJson: string,
): Promise<{ savedAt: string }> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);

  const markdown = pmToMarkdown(contentJson);
  const updated = await prisma.page.update({
    where: { id: pageId },
    data: { content: contentJson, markdown },
    select: { updatedAt: true },
  });

  await resolveLinksForPage(pageId);
  // Refresh backlinks on any page this one links to/from.
  revalidatePath("/app", "layout");
  return { savedAt: updated.updatedAt.toISOString() };
}

export async function deletePage(pageId: string): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);
  // Cascade removes descendants and related links.
  await prisma.page.delete({ where: { id: pageId } });
  revalidatePath("/app", "layout");
}

export async function archivePage(
  pageId: string,
  archived: boolean,
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);
  await prisma.page.update({
    where: { id: pageId },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidatePath("/app", "layout");
}

/**
 * Used when a wikilink is clicked: return the existing page with this title, or
 * create it on the fly (Obsidian behavior). Returns the target page id.
 */
export async function resolveOrCreatePage(label: string): Promise<string> {
  const workspaceId = await getActiveWorkspaceId();
  const clean = label.trim() || "Untitled";

  const all = await prisma.page.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, title: true },
  });
  const match = all.find(
    (p) => normalizeTitle(p.title) === normalizeTitle(clean),
  );
  if (match) return match.id;

  const siblingCount = await prisma.page.count({
    where: { workspaceId, parentId: null, archivedAt: null },
  });
  const page = await prisma.page.create({
    data: {
      workspaceId,
      title: clean,
      content: "",
      markdown: "",
      order: siblingCount,
    },
  });

  // Resolving the new page lets existing dangling links connect to it.
  await resolveAllLinks(workspaceId);
  revalidatePath("/app", "layout");
  return page.id;
}

/**
 * Full-text-ish search over page titles and markdown content. Phase 2 will swap
 * this for a database FTS index; the contains-filter is fine at small scale.
 */
export async function searchWorkspace(
  query: string,
): Promise<
  { id: string; title: string; icon: string | null; excerpt: string }[]
> {
  const workspaceId = await getActiveWorkspaceId();
  const q = query.trim();
  if (!q) return [];
  const pages = await prisma.page.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      OR: [
        { title: { contains: q } },
        { markdown: { contains: q } },
      ],
    },
    select: { id: true, title: true, icon: true, markdown: true },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });
  return pages.map((p) => {
    const idx = p.markdown.toLowerCase().indexOf(q.toLowerCase());
    const start = idx >= 0 ? Math.max(0, idx - 40) : 0;
    return {
      id: p.id,
      title: p.title,
      icon: p.icon,
      excerpt: p.markdown.slice(start, start + 160),
    };
  });
}

/**
 * Lightweight page list for wikilink autocomplete in the editor.
 */
export async function searchPages(
  query: string,
): Promise<{ id: string; title: string; icon: string | null }[]> {
  const workspaceId = await getActiveWorkspaceId();
  const q = query.trim().toLowerCase();
  const pages = await prisma.page.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, title: true, icon: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  if (!q) return pages.slice(0, 8);
  return pages
    .filter((p) => p.title.toLowerCase().includes(q))
    .slice(0, 8);
}
