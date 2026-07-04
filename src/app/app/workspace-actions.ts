"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { bootstrapWorkspace } from "@/lib/workspace";
import { getActiveWorkspaceId } from "./actions";
import { limit, LIMITS } from "@/lib/validation";

const WORKSPACE_COOKIE = "z_workspace";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  active: boolean;
};

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const session = await requireSession();
  const activeId = await getActiveWorkspaceId();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.userId },
    select: {
      role: true,
      workspace: {
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    role: m.role,
    memberCount: m.workspace._count.members,
    active: m.workspace.id === activeId,
  }));
}

async function assertMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!member) throw new Error("Not a member of this workspace");
  return member;
}

export async function switchWorkspace(workspaceId: string): Promise<void> {
  const session = await requireSession();
  await assertMember(workspaceId, session.userId);
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
}

export async function createWorkspace(name: string): Promise<string> {
  const session = await requireSession();
  limit(name, LIMITS.title, "Workspace name");
  const { workspaceId } = await bootstrapWorkspace(
    session.userId,
    name.trim() || "New Workspace",
  );
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
  return workspaceId;
}

export type Member = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isSelf: boolean;
};

export async function listMembers(): Promise<{
  members: Member[];
  isOwner: boolean;
}> {
  const session = await requireSession();
  const workspaceId = await getActiveWorkspaceId();
  const me = await assertMember(workspaceId, session.userId);
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: {
      role: true,
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return {
    isOwner: me.role === "owner",
    members: rows.map((r) => ({
      userId: r.user.id,
      email: r.user.email,
      name: r.user.name,
      role: r.role,
      isSelf: r.user.id === session.userId,
    })),
  };
}

export async function inviteMember(
  rawEmail: string,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await requireSession();
  const workspaceId = await getActiveWorkspaceId();
  const me = await assertMember(workspaceId, session.userId);
  if (me.role !== "owner") return { error: "Only the owner can invite members." };

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "No account with that email. Ask them to sign up first." };
  }
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (existing) return { error: "That person is already a member." };

  await prisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, role: "editor" },
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<void> {
  const session = await requireSession();
  const workspaceId = await getActiveWorkspaceId();
  const me = await assertMember(workspaceId, session.userId);
  if (me.role !== "owner") throw new Error("Only the owner can remove members.");

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!target || target.role === "owner") return; // never remove the owner
  await prisma.workspaceMember.deleteMany({ where: { workspaceId, userId } });
  revalidatePath("/app", "layout");
}
