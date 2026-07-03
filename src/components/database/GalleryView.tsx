"use client";

import { Maximize2 } from "lucide-react";
import type { SharedViewProps } from "./DatabaseView";
import { Cell, SelectChip } from "./Cell";

export function GalleryView({
  properties,
  rows,
  onCellChange,
  onCreateOption,
  onOpenRow,
}: SharedViewProps) {
  const nameProp = properties.find((p) => p.type === "text") ?? properties[0];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.id}
          className="group/card rounded-lg border border-border bg-surface/60 p-3"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            {nameProp && (
              <div className="flex-1 text-sm font-semibold">
                <Cell
                  property={nameProp}
                  value={row.cells[nameProp.id] ?? null}
                  onChange={(v) => onCellChange(row.id, nameProp.id, v)}
                  onCreateOption={(name) => onCreateOption(nameProp.id, name)}
                />
              </div>
            )}
            <button
              onClick={() => onOpenRow(row.id)}
              className="flex-shrink-0 rounded p-0.5 text-muted opacity-0 hover:bg-surface-hover hover:text-text group-hover/card:opacity-100"
              title="Open as page"
            >
              <Maximize2 size={13} />
            </button>
          </div>
          <div className="space-y-1.5">
            {properties
              .filter((p) => p.id !== nameProp?.id)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-20 flex-shrink-0 text-muted">{p.name}</span>
                  <div className="flex-1">
                    {p.type === "select" ? (
                      (() => {
                        const opt = p.options.find(
                          (o) => o.id === row.cells[p.id],
                        );
                        return opt ? (
                          <SelectChip option={opt} />
                        ) : (
                          <span className="text-muted/50">—</span>
                        );
                      })()
                    ) : (
                      <Cell
                        property={p}
                        value={row.cells[p.id] ?? null}
                        onChange={(v) => onCellChange(row.id, p.id, v)}
                        onCreateOption={(name) => onCreateOption(p.id, name)}
                        compact
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="col-span-full py-6 text-center text-sm text-muted">
          No rows yet.
        </p>
      )}
    </div>
  );
}
