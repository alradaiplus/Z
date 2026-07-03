import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "../actions";
import { PageEditor } from "@/components/editor/PageEditor";
import { Backlinks, type BacklinkRef } from "@/components/backlinks/Backlinks";
import { DatabaseView } from "@/components/database/DatabaseView";
import { TagBar } from "@/components/tags/TagBar";
import { LocalGraphPanel } from "@/components/graph/LocalGraphPanel";
import { getLocalGraph } from "../graph-actions";

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
      type: true,
      title: true,
      icon: true,
      content: true,
      tags: { select: { tag: { select: { id: true, name: true } } } },
      databaseRow: {
        select: {
          database: {
            select: { page: { select: { id: true, title: true, icon: true } } },
          },
        },
      },
    },
  });
  if (!page) notFound();

  const tags = page.tags.map((t) => t.tag);
  const tagBar = <TagBar pageId={page.id} initialTags={tags} />;

  // Breadcrumb back to the parent database when this is a row detail page.
  const dbPage = page.databaseRow?.database.page;
  const breadcrumb = dbPage ? (
    <Link
      href={`/app/${dbPage.id}`}
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text"
    >
      <ChevronLeft size={14} />
      {dbPage.icon ?? "🗄️"} {dbPage.title || "Database"}
    </Link>
  ) : null;

  // ---- Database page ----
  if (page.type === "database") {
    const database = await prisma.database.findUnique({
      where: { pageId: page.id },
      include: {
        properties: { orderBy: { order: "asc" } },
        rows: { orderBy: { order: "asc" } },
        views: { orderBy: { order: "asc" } },
      },
    });
    if (!database) notFound();

    return (
      <DatabaseView
        key={page.id}
        pageId={page.id}
        databaseId={database.id}
        title={page.title}
        icon={page.icon}
        tagBar={tagBar}
        rawProperties={database.properties}
        rawRows={database.rows}
        rawViews={database.views}
      />
    );
  }

  // ---- Document page ----
  const [incoming, allPages, localGraph] = await Promise.all([
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
    getLocalGraph(pageId),
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
      breadcrumb={breadcrumb}
      tagBar={tagBar}
      backlinks={
        <>
          <Backlinks links={backlinks} />
          <LocalGraphPanel data={localGraph} focusId={page.id} />
        </>
      }
    />
  );
}
