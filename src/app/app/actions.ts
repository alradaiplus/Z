"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { limit, LIMITS } from "@/lib/validation";
import { requireSession } from "@/lib/auth";
import { pmToMarkdown } from "@/lib/markdown";
import { normalizeTitle } from "@/lib/wikilinks";
import {
  bootstrapWorkspace,
  resolveLinksForPage,
  resolveAllLinks,
} from "@/lib/workspace";

const WORKSPACE_COOKIE = "z_workspace";

/**
 * Resolve the active workspace for the current user. Honours the `z_workspace`
 * cookie when the user is a member of it; otherwise falls back to their first
 * membership (bootstrapping one if the account somehow has none). Because every
 * other query keys off this id, membership is the single access-control gate.
 */
export async function getActiveWorkspaceId(): Promise<string> {
  const session = await requireSession();

  const preferred = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  if (preferred) {
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: preferred, userId: session.userId },
      },
      select: { workspaceId: true },
    });
    if (member) return member.workspaceId;
  }

  // Default to the user's earliest membership — i.e. their own workspace,
  // created at signup — until they explicitly switch to a shared one.
  const first = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (first) return first.workspaceId;

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
  limit(title, LIMITS.title, "Title");

  const clean = title.trim() || "Untitled";
  await prisma.page.update({
    where: { id: pageId },
    data: { title: clean },
  });

  // If this page is a database row's detail page, mirror the title into the
  // row's primary text property so the table stays in sync.
  const row = await prisma.databaseRow.findUnique({
    where: { pageId },
    select: {
      id: true,
      cells: true,
      database: {
        select: {
          properties: {
            orderBy: { order: "asc" },
            select: { id: true, type: true },
          },
        },
      },
    },
  });
  if (row) {
    const props = row.database.properties;
    const nameProp = props.find((p) => p.type === "text") ?? props[0];
    if (nameProp) {
      let cells: Record<string, unknown> = {};
      try {
        cells = JSON.parse(row.cells);
      } catch {
        cells = {};
      }
      cells[nameProp.id] = clean;
      await prisma.databaseRow.update({
        where: { id: row.id },
        data: { cells: JSON.stringify(cells) },
      });
    }
  }

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
  if (icon) limit(icon, LIMITS.icon, "Icon");
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
  limit(contentJson, LIMITS.content, "Page content");

  // Snapshot the previous state for version history (throttled to ~every 3 min
  // of active editing) before overwriting it.
  const before = await prisma.page.findUnique({
    where: { id: pageId },
    select: { title: true, content: true, markdown: true },
  });
  if (before && before.content && before.content !== contentJson) {
    await snapshotVersion(pageId, before);
  }

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

const VERSION_INTERVAL_MS = 3 * 60_000;
const MAX_VERSIONS = 50;

async function snapshotVersion(
  pageId: string,
  state: { title: string; content: string; markdown: string },
  force = false,
): Promise<void> {
  if (!force) {
    const last = await prisma.pageVersion.findFirst({
      where: { pageId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (last && Date.now() - last.createdAt.getTime() < VERSION_INTERVAL_MS) {
      return;
    }
  }
  await prisma.pageVersion.create({ data: { pageId, ...state } });

  // Prune to the most recent MAX_VERSIONS.
  const old = await prisma.pageVersion.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (old.length) {
    await prisma.pageVersion.deleteMany({
      where: { id: { in: old.map((o) => o.id) } },
    });
  }
}

/** List a page's version snapshots, newest first. */
export async function listVersions(
  pageId: string,
): Promise<{ id: string; title: string; createdAt: string; preview: string }[]> {
  const workspaceId = await getActiveWorkspaceId();
  await assertPageInWorkspace(pageId, workspaceId);
  const versions = await prisma.pageVersion.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, markdown: true },
    take: MAX_VERSIONS,
  });
  return versions.map((v) => ({
    id: v.id,
    title: v.title,
    createdAt: v.createdAt.toISOString(),
    preview: v.markdown.replace(/\n+/g, " ").slice(0, 120),
  }));
}

/**
 * Restore a page to a snapshot. Snapshots the current state first (so the
 * restore is itself reversible), then returns the restored content for the
 * editor to apply.
 */
export async function restoreVersion(
  versionId: string,
): Promise<{ title: string; content: string }> {
  const workspaceId = await getActiveWorkspaceId();
  const version = await prisma.pageVersion.findFirst({
    where: { id: versionId, page: { workspaceId } },
    select: { pageId: true, title: true, content: true, markdown: true },
  });
  if (!version) throw new Error("Version not found");

  const current = await prisma.page.findUnique({
    where: { id: version.pageId },
    select: { title: true, content: true, markdown: true },
  });
  if (current?.content) {
    await snapshotVersion(version.pageId, current, true);
  }

  await prisma.page.update({
    where: { id: version.pageId },
    data: {
      title: version.title,
      content: version.content,
      markdown: version.markdown,
    },
  });
  await resolveLinksForPage(version.pageId);
  revalidatePath("/app", "layout");
  return { title: version.title, content: version.content };
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
 * Pages currently in the trash (archived), most-recently-archived first.
 */
export async function listArchivedPages(): Promise<
  { id: string; title: string; icon: string | null; type: string }[]
> {
  const workspaceId = await getActiveWorkspaceId();
  const pages = await prisma.page.findMany({
    where: { workspaceId, archivedAt: { not: null } },
    select: { id: true, title: true, icon: true, type: true },
    orderBy: { archivedAt: "desc" },
  });
  return pages;
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
