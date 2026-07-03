"use client";

import { useEffect, useState, useTransition } from "react";
import { X, RotateCcw, History } from "lucide-react";
import { listVersions, restoreVersion } from "@/app/app/actions";

type Version = {
  id: string;
  title: string;
  createdAt: string;
  preview: string;
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function HistoryPanel({
  pageId,
  onRestore,
  onClose,
}: {
  pageId: string;
  onRestore: (v: { title: string; content: string }) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    listVersions(pageId).then(setVersions);
  }, [pageId]);

  const restore = (id: string) =>
    startTransition(async () => {
      const result = await restoreVersion(id);
      onRestore(result);
      onClose();
    });

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display flex items-center gap-2 text-sm font-semibold">
            <History size={16} /> Version history
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {versions === null ? (
            <p className="px-2 py-6 text-center text-sm text-muted">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              No earlier versions yet. Snapshots are saved automatically as you
              edit.
            </p>
          ) : (
            <ul className="space-y-1">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="group rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-surface"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {timeAgo(v.createdAt)}
                    </span>
                    <button
                      onClick={() => restore(v.id)}
                      className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted opacity-0 hover:bg-surface-hover hover:text-text group-hover:opacity-100"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {v.title || "Untitled"}
                  </div>
                  {v.preview && (
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted/70">
                      {v.preview}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
