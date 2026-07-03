import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { buildTree } from "@/lib/page-tree";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { AppShell } from "@/components/AppShell";

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
      // Exclude database row detail pages from the sidebar tree.
      where: { workspaceId, archivedAt: null, databaseRow: { is: null } },
      select: { id: true, title: true, icon: true, parentId: true, order: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const tree = buildTree(pages);

  return (
    <>
      <AppShell
        sidebar={
          <Sidebar
            tree={tree}
            workspaceName={workspace?.name ?? "Workspace"}
            userEmail={session.email}
          />
        }
      >
        {children}
      </AppShell>
      <CommandPalette />
    </>
  );
}
