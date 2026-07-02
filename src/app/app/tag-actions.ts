"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { limit, LIMITS } from "@/lib/validation";

export async function getPageTags(
  pageId: string,
): Promise<{ id: string; name: string }[]> {
  const workspaceId = await getActiveWorkspaceId();
  const rows = await prisma.pageTag.findMany({
    where: { pageId, tag: { workspaceId } },
    select: { tag: { select: { id: true, name: true } } },
    orderBy: { tag: { name: "asc" } },
  });
  return rows.map((r) => r.tag);
}

export async function addTagToPage(
  pageId: string,
  rawName: string,
): Promise<{ id: string; name: string } | null> {
  const workspaceId = await getActiveWorkspaceId();
  const name = rawName.trim().replace(/^#/, "");
  if (!name) return null;
  limit(name, LIMITS.tag, "Tag");

  // Ensure the page belongs to the workspace.
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: { id: true },
  });
  if (!page) throw new Error("Page not found");

  const tag = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId, name } },
    create: { workspaceId, name },
    update: {},
  });

  await prisma.pageTag.upsert({
    where: { pageId_tagId: { pageId, tagId: tag.id } },
    create: { pageId, tagId: tag.id },
    update: {},
  });

  revalidatePath("/app", "layout");
  return { id: tag.id, name: tag.name };
}

export async function removeTagFromPage(
  pageId: string,
  tagId: string,
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const tag = await prisma.tag.findFirst({
    where: { id: tagId, workspaceId },
    select: { id: true },
  });
  if (!tag) return;

  await prisma.pageTag.deleteMany({ where: { pageId, tagId } });

  // Clean up tags that are no longer used.
  const remaining = await prisma.pageTag.count({ where: { tagId } });
  if (remaining === 0) {
    await prisma.tag.delete({ where: { id: tagId } });
  }
  revalidatePath("/app", "layout");
}

export async function listWorkspaceTags(): Promise<
  { id: string; name: string; count: number }[]
> {
  const workspaceId = await getActiveWorkspaceId();
  const tags = await prisma.tag.findMany({
    where: { workspaceId },
    select: { id: true, name: true, _count: { select: { pages: true } } },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({ id: t.id, name: t.name, count: t._count.pages }));
}

export async function getTaggedPages(
  tagName: string,
): Promise<{ id: string; title: string; icon: string | null }[]> {
  const workspaceId = await getActiveWorkspaceId();
  const rows = await prisma.pageTag.findMany({
    where: {
      tag: { workspaceId, name: tagName },
      page: { archivedAt: null },
    },
    select: { page: { select: { id: true, title: true, icon: true } } },
    orderBy: { page: { updatedAt: "desc" } },
  });
  return rows.map((r) => r.page);
}
