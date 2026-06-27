import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { EmptyState } from "@/components/EmptyState";

export default async function AppIndex() {
  const workspaceId = await getActiveWorkspaceId();
  const firstPage = await prisma.page.findFirst({
    where: { workspaceId, archivedAt: null, parentId: null },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (firstPage) redirect(`/app/${firstPage.id}`);
  return <EmptyState />;
}
