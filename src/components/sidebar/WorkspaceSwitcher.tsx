"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Users } from "lucide-react";
import {
  switchWorkspace,
  createWorkspace,
  type WorkspaceSummary,
} from "@/app/app/workspace-actions";
import { MembersModal } from "./MembersModal";

export function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: WorkspaceSummary[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState(false);
  const [, startTransition] = useTransition();

  const active = workspaces.find((w) => w.active) ?? workspaces[0];

  const switchTo = (id: string) => {
    setOpen(false);
    startTransition(async () => {
      await switchWorkspace(id);
      router.push("/app");
      router.refresh();
    });
  };

  const create = () => {
    setOpen(false);
    const name = window.prompt("Name your new workspace:");
    if (!name?.trim()) return;
    startTransition(async () => {
      await createWorkspace(name.trim());
      router.push("/app");
      router.refresh();
    });
  };

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch workspace"
        className="flex w-full items-center gap-2 overflow-hidden rounded-md px-1 py-0.5 hover:bg-surface-hover"
      >
        <div className="font-display flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-accent text-xs font-extrabold text-white">
          {(active?.name ?? "Z").slice(0, 1).toUpperCase()}
        </div>
        <span className="font-display truncate text-sm font-semibold">
          {active?.name ?? "Workspace"}
        </span>
        <ChevronsUpDown size={14} className="ml-auto flex-shrink-0 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-60 rounded-md border border-border bg-bg p-1 shadow-lg">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
              Workspaces
            </div>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => switchTo(w.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-surface text-[10px] font-bold">
                  {w.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{w.name}</span>
                {w.memberCount > 1 && (
                  <span className="flex items-center gap-0.5 text-xs text-muted">
                    <Users size={11} />
                    {w.memberCount}
                  </span>
                )}
                {w.active && <Check size={14} className="text-accent" />}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => {
                setOpen(false);
                setMembers(true);
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
            >
              <Users size={14} /> Members &amp; sharing
            </button>
            <button
              onClick={create}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
            >
              <Plus size={14} /> New workspace
            </button>
          </div>
        </>
      )}

      {members && <MembersModal onClose={() => setMembers(false)} />}
    </div>
  );
}
