"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { createPage } from "@/app/app/actions";

export function EmptyState() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const create = () => {
    setBusy(true);
    startTransition(async () => {
      const id = await createPage(null);
      router.push(`/app/${id}`);
    });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <FileText size={40} className="mb-4 text-muted" />
      <h2 className="text-lg font-semibold">No pages yet</h2>
      <p className="mt-1 text-sm text-muted">
        Create your first page to start writing.
      </p>
      <button
        onClick={create}
        disabled={pending || busy}
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        New page
      </button>
    </div>
  );
}
