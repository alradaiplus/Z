"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  FileText,
  MoreHorizontal,
  Trash2,
  Search,
  Database,
  Tag,
  Share2,
} from "lucide-react";
import type { TreeNode } from "@/lib/page-tree";
import {
  createPage,
  deletePage,
  archivePage,
} from "@/app/app/actions";
import { createDatabasePage } from "@/app/app/database-actions";
import { logout } from "@/app/(auth)/actions";
import { confirmDialog } from "@/components/ui/confirm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { WorkspaceSummary } from "@/app/app/workspace-actions";

export function Sidebar({
  tree,
  workspaces,
  userEmail,
}: {
  tree: TreeNode[];
  workspaces: WorkspaceSummary[];
  userEmail: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const newRootPage = () => {
    startTransition(async () => {
      const id = await createPage(null);
      router.push(`/app/${id}`);
    });
  };

  const newDatabase = () => {
    startTransition(async () => {
      const id = await createDatabasePage(null);
      router.push(`/app/${id}`);
    });
  };

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between gap-1 px-3 py-3">
        <WorkspaceSwitcher workspaces={workspaces} />
        <ThemeToggle />
      </div>

      <div className="px-2">
        <Link
          href="/app/search"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-text"
        >
          <Search size={15} />
          Search
          <kbd className="ml-auto rounded border border-border px-1 text-[10px]">
            ⌘K
          </kbd>
        </Link>
        <Link
          href="/app/tags"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-text"
        >
          <Tag size={15} />
          Tags
        </Link>
        <Link
          href="/app/graph"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-text"
        >
          <Share2 size={15} />
          Graph
        </Link>
        <Link
          href="/app/trash"
          className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-text"
        >
          <Trash2 size={15} />
          Trash
        </Link>
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Pages
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={newDatabase}
            className="rounded p-0.5 text-muted hover:bg-surface-hover hover:text-text"
            title="New database"
          >
            <Database size={14} />
          </button>
          <button
            onClick={newRootPage}
            className="rounded p-0.5 text-muted hover:bg-surface-hover hover:text-text"
            title="New page"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {tree.length === 0 ? (
          <button
            onClick={newRootPage}
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted hover:bg-surface-hover"
          >
            + New page
          </button>
        ) : (
          tree.map((node) => (
            <PageItem key={node.id} node={node} depth={0} />
          ))
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-muted" title={userEmail}>
            {userEmail}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-muted hover:text-text hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function PageItem({ node, depth }: { node: TreeNode; depth: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();

  const active = pathname === `/app/${node.id}`;
  const hasChildren = node.children.length > 0;

  const addSubpage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const id = await createPage(node.id);
      setExpanded(true);
      router.push(`/app/${id}`);
    });
  };

  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    const ok = await confirmDialog({
      title: `Delete "${node.title || "Untitled"}"?`,
      body: hasChildren
        ? "Its subpages will be deleted too. This cannot be undone."
        : "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deletePage(node.id);
      if (active) router.push("/app");
    });
  };

  const archive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    startTransition(async () => {
      await archivePage(node.id, true);
      if (active) router.push("/app");
    });
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md pr-1 ${
          active ? "bg-surface-hover" : "hover:bg-surface-hover"
        }`}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted hover:bg-border ${
            hasChildren ? "" : "invisible"
          }`}
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>

        <Link
          href={`/app/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-sm"
        >
          <span className="flex-shrink-0">
            {node.icon ?? <FileText size={14} className="text-muted" />}
          </span>
          <span className="truncate">{node.title || "Untitled"}</span>
        </Link>

        <button
          onClick={addSubpage}
          className="flex-shrink-0 rounded p-0.5 text-muted opacity-0 hover:bg-border hover:text-text group-hover:opacity-100"
          title="Add subpage"
        >
          <Plus size={14} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen((v) => !v);
            }}
            className="flex-shrink-0 rounded p-0.5 text-muted opacity-0 hover:bg-border hover:text-text group-hover:opacity-100"
            title="More"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-border bg-bg py-1 shadow-lg">
                <button
                  onClick={archive}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
                >
                  Archive
                </button>
                <button
                  onClick={remove}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 hover:bg-surface-hover"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <PageItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
