import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { buildTree } from "@/lib/page-tree";
import { Sidebar } from "@/components/sidebar/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const workspaceId = await getActiveWorkspaceId();

  const [workspace, pages] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    }),
    prisma.page.findMany({
      where: { workspaceId, archivedAt: null },
      select: { id: true, title: true, icon: true, parentId: true, order: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const tree = buildTree(pages);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar
        tree={tree}
        workspaceName={workspace?.name ?? "Workspace"}
        userEmail={session.email}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
