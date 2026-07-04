"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Database, RotateCcw, Trash2 } from "lucide-react";
import { archivePage, deletePage } from "@/app/app/actions";
import { confirmDialog } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toast";

type ArchivedPage = {
  id: string;
  title: string;
  icon: string | null;
  type: string;
};

export function TrashClient({ pages }: { pages: ArchivedPage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(pages);
  const [, startTransition] = useTransition();

  const restore = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await archivePage(id, false);
      router.refresh();
    });
  };

  const remove = async (id: string, title: string) => {
    const ok = await confirmDialog({
      title: `Permanently delete "${title || "Untitled"}"?`,
      body: "This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setItems((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await deletePage(id);
      router.refresh();
      toast.success("Deleted permanently");
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted">
        Trash is empty.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li
          key={p.id}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
        >
          <span className="flex-shrink-0">
            {p.icon ??
              (p.type === "database" ? (
                <Database size={15} className="text-muted" />
              ) : (
                <FileText size={15} className="text-muted" />
              ))}
          </span>
          <span className="flex-1 truncate text-sm">
            {p.title || "Untitled"}
          </span>
          <button
            onClick={() => restore(p.id)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-surface-hover hover:text-text"
          >
            <RotateCcw size={13} /> Restore
          </button>
          <button
            onClick={() => void remove(p.id, p.title)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-surface-hover"
          >
            <Trash2 size={13} /> Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
