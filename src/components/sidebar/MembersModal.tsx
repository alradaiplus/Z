"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, Crown } from "lucide-react";
import {
  listMembers,
  inviteMember,
  removeMember,
  type Member,
} from "@/app/app/workspace-actions";

export function MembersModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<{ members: Member[]; isOwner: boolean } | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const load = () => listMembers().then(setData);
  useEffect(() => {
    load();
  }, []);

  const invite = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await inviteMember(email);
      setMsg(res);
      if (res.ok) {
        setEmail("");
        load();
        router.refresh();
      }
    });
  };

  const remove = (userId: string) =>
    startTransition(async () => {
      await removeMember(userId);
      load();
      router.refresh();
    });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Members &amp; sharing</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {data?.isOwner && (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
                placeholder="teammate@example.com"
                type="email"
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={invite}
                className="flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                <UserPlus size={14} /> Invite
              </button>
            </div>
            {msg?.error && (
              <p className="mt-2 text-xs text-red-500">{msg.error}</p>
            )}
            {msg?.ok && (
              <p className="mt-2 text-xs text-green-600">Member added.</p>
            )}
            <p className="mt-2 text-xs text-muted">
              They must already have a Z account.
            </p>
          </div>
        )}

        <ul className="space-y-1">
          {data?.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: "rgb(var(--accent))" }}
              >
                {(m.name || m.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  {m.name || m.email}
                  {m.isSelf && <span className="text-muted"> (you)</span>}
                </div>
                <div className="truncate text-xs text-muted">{m.email}</div>
              </div>
              {m.role === "owner" ? (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Crown size={12} /> Owner
                </span>
              ) : (
                data?.isOwner && (
                  <button
                    onClick={() => remove(m.userId)}
                    className="text-xs text-muted hover:text-red-500"
                  >
                    Remove
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
