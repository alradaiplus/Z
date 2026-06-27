import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "../actions";
import { PageEditor } from "@/components/editor/PageEditor";
import { Backlinks, type BacklinkRef } from "@/components/backlinks/Backlinks";

export default async function PageView({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const workspaceId = await getActiveWorkspaceId();

  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: {
      id: true,
      title: true,
      icon: true,
      content: true,
    },
  });
  if (!page) notFound();

  const [incoming, allPages] = await Promise.all([
    prisma.link.findMany({
      where: { targetPageId: pageId },
      select: {
        sourcePage: {
          select: { id: true, title: true, icon: true, markdown: true },
        },
      },
    }),
    prisma.page.findMany({
      where: { workspaceId, archivedAt: null },
      select: { title: true },
    }),
  ]);

  const backlinks: BacklinkRef[] = incoming.map((l) => ({
    id: l.sourcePage.id,
    title: l.sourcePage.title,
    icon: l.sourcePage.icon,
    excerpt: l.sourcePage.markdown.slice(0, 160),
  }));

  const knownTitles = allPages.map((p) => p.title);

  return (
    <PageEditor
      key={page.id}
      pageId={page.id}
      initialTitle={page.title}
      initialIcon={page.icon}
      initialContent={page.content}
      knownTitles={knownTitles}
      backlinks={<Backlinks links={backlinks} />}
    />
  );
}
