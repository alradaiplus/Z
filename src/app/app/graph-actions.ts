"use server";

import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";

export type GraphNode = {
  id: string;
  title: string;
  icon: string | null;
  type: string;
  degree: number;
};

export type GraphLink = { source: string; target: string };

export type GraphData = { nodes: GraphNode[]; links: GraphLink[] };

/**
 * Full workspace graph: every page is a node, every resolved wikilink an edge.
 */
export async function getGraphData(): Promise<GraphData> {
  const workspaceId = await getActiveWorkspaceId();

  const [pages, links] = await Promise.all([
    prisma.page.findMany({
      where: { workspaceId, archivedAt: null },
      select: { id: true, title: true, icon: true, type: true },
    }),
    prisma.link.findMany({
      where: { workspaceId },
      select: { sourcePageId: true, targetPageId: true },
    }),
  ]);

  const valid = new Set(pages.map((p) => p.id));
  const degree = new Map<string, number>();
  const edges: GraphLink[] = [];

  for (const l of links) {
    if (!valid.has(l.sourcePageId) || !valid.has(l.targetPageId)) continue;
    edges.push({ source: l.sourcePageId, target: l.targetPageId });
    degree.set(l.sourcePageId, (degree.get(l.sourcePageId) ?? 0) + 1);
    degree.set(l.targetPageId, (degree.get(l.targetPageId) ?? 0) + 1);
  }

  return {
    nodes: pages.map((p) => ({
      id: p.id,
      title: p.title,
      icon: p.icon,
      type: p.type,
      degree: degree.get(p.id) ?? 0,
    })),
    links: edges,
  };
}

/**
 * One-hop neighborhood around a page (itself + pages it links to / from).
 */
export async function getLocalGraph(pageId: string): Promise<GraphData> {
  const workspaceId = await getActiveWorkspaceId();

  const links = await prisma.link.findMany({
    where: {
      workspaceId,
      OR: [{ sourcePageId: pageId }, { targetPageId: pageId }],
    },
    select: { sourcePageId: true, targetPageId: true },
  });

  const ids = new Set<string>([pageId]);
  for (const l of links) {
    ids.add(l.sourcePageId);
    ids.add(l.targetPageId);
  }

  const pages = await prisma.page.findMany({
    where: { id: { in: Array.from(ids) }, archivedAt: null },
    select: { id: true, title: true, icon: true, type: true },
  });
  const valid = new Set(pages.map((p) => p.id));

  const degree = new Map<string, number>();
  const edges: GraphLink[] = [];
  for (const l of links) {
    if (!valid.has(l.sourcePageId) || !valid.has(l.targetPageId)) continue;
    edges.push({ source: l.sourcePageId, target: l.targetPageId });
    degree.set(l.sourcePageId, (degree.get(l.sourcePageId) ?? 0) + 1);
    degree.set(l.targetPageId, (degree.get(l.targetPageId) ?? 0) + 1);
  }

  return {
    nodes: pages.map((p) => ({
      id: p.id,
      title: p.title,
      icon: p.icon,
      type: p.type,
      degree: degree.get(p.id) ?? 0,
    })),
    links: edges,
  };
}
