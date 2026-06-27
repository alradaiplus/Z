"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Share2, Maximize2 } from "lucide-react";
import type { GraphData } from "@/app/app/graph-actions";
import { GraphCanvas } from "./GraphCanvas";

export function LocalGraphPanel({
  data,
  focusId,
}: {
  data: GraphData;
  focusId: string;
}) {
  const [open, setOpen] = useState(false);

  // Only meaningful when the page has at least one connection.
  if (data.nodes.length <= 1) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"
        >
          <ChevronRight
            size={15}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          />
          <Share2 size={14} />
          Local graph
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs">
            {data.nodes.length}
          </span>
        </button>
        <Link
          href="/app/graph"
          className="flex items-center gap-1 text-xs text-muted hover:text-text"
        >
          <Maximize2 size={12} /> Full graph
        </Link>
      </div>

      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface/40">
          <GraphCanvas data={data} focusId={focusId} className="h-72 w-full" />
        </div>
      )}
    </section>
  );
}
