import "server-only";
import { prisma } from "./db";
import { defaultPages } from "./default-content";
import { pmToMarkdown } from "./markdown";
import { extractWikiLinks, parseContent, normalizeTitle } from "./wikilinks";

/**
 * Recompute the Link rows for a single page by extracting its wikilinks and
 * matching their labels (case-insensitively) to pages in the same workspace.
 * Unresolved labels simply produce no link until the target page exists.
 */
export async function resolveLinksForPage(pageId: string): Promise<void> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { id: true, workspaceId: true, content: true },
  });
  if (!page) return;

  const labels = extractWikiLinks(parseContent(page.content));

  // Map normalized titles -> page id within the workspace.
  const candidates = await prisma.page.findMany({
    where: { workspaceId: page.workspaceId, archivedAt: null },
    select: { id: true, title: true },
  });
  const byTitle = new Map<string, string>();
  for (const c of candidates) byTitle.set(normalizeTitle(c.title), c.id);

  const targetIds = new Set<string>();
  for (const label of labels) {
    const targetId = byTitle.get(normalizeTitle(label));
    if (targetId && targetId !== page.id) targetIds.add(targetId);
  }

  await prisma.$transaction([
    prisma.link.deleteMany({ where: { sourcePageId: page.id } }),
    ...Array.from(targetIds).map((targetPageId) =>
      prisma.link.create({
        data: {
          workspaceId: page.workspaceId,
          sourcePageId: page.id,
          targetPageId,
        },
      }),
    ),
  ]);
}

/**
 * Re-resolve links for every page in a workspace. Used after a bulk insert
 * (seed / signup) and after a page is renamed (which can resolve dangling links).
 */
export async function resolveAllLinks(workspaceId: string): Promise<void> {
  const pages = await prisma.page.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  for (const p of pages) {
    await resolveLinksForPage(p.id);
  }
}

/**
 * Create a workspace pre-populated with the starter pages. Returns the id of the
 * page that should open first (the welcome page).
 */
export async function bootstrapWorkspace(
  userId: string,
  name = "My Workspace",
): Promise<{ workspaceId: string; firstPageId: string }> {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      ownerId: userId,
      members: { create: { userId, role: "owner" } },
    },
  });

  const pages = defaultPages();
  const keyToId = new Map<string, string>();
  const parentByKey: Record<string, string | null> = {
    welcome: null,
    "getting-started": "welcome",
    ideas: "welcome",
  };
  const orderByKey: Record<string, number> = {
    welcome: 0,
    "getting-started": 0,
    ideas: 1,
  };

  // Insert in dependency order (parents before children).
  for (const key of ["welcome", "getting-started", "ideas"]) {
    const seed = pages.find((p) => p.key === key)!;
    const parentKey = parentByKey[key];
    const created = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        parentId: parentKey ? keyToId.get(parentKey)! : null,
        title: seed.title,
        icon: seed.icon,
        content: JSON.stringify(seed.doc),
        markdown: pmToMarkdown(seed.doc),
        order: orderByKey[key],
      },
    });
    keyToId.set(key, created.id);
  }

  await resolveAllLinks(workspace.id);

  return { workspaceId: workspace.id, firstPageId: keyToId.get("welcome")! };
}
