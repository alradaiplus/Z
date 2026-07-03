"use client";

import { useState } from "react";
import { Plus, Trash2, Maximize2 } from "lucide-react";
import {
  PROPERTY_TYPES,
  type PropertyType,
} from "@/lib/database";
import { addProperty, deleteRow } from "@/app/app/database-actions";
import type { SharedViewProps } from "./DatabaseView";
import { Cell } from "./Cell";
import { PropertyMenu } from "./PropertyMenu";

export function TableView({
  databaseId,
  properties,
  rows,
  onCellChange,
  onCreateOption,
  onOpenRow,
  refresh,
}: SharedViewProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {properties.map((p) => (
              <th
                key={p.id}
                className="min-w-[160px] border-r border-border px-3 py-2 text-left font-normal"
              >
                <PropertyMenu
                  property={p}
                  canDelete={properties.length > 1}
                  refresh={refresh}
                />
              </th>
            ))}
            <th className="w-10 px-2 py-2">
              <AddPropertyButton databaseId={databaseId} refresh={refresh} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="group border-b border-border last:border-0 hover:bg-surface/50"
            >
              {properties.map((p) => (
                <td
                  key={p.id}
                  className="border-r border-border px-3 py-1.5 align-top"
                >
                  <Cell
                    property={p}
                    value={row.cells[p.id] ?? null}
                    onChange={(v) => onCellChange(row.id, p.id, v)}
                    onCreateOption={(name) => onCreateOption(p.id, name)}
                  />
                </td>
              ))}
              <td className="px-2 align-middle">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenRow(row.id)}
                    className="rounded p-0.5 text-muted opacity-0 hover:bg-surface-hover hover:text-text group-hover:opacity-100"
                    title="Open as page"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteRow(row.id).then(refresh)}
                    className="rounded p-0.5 text-muted opacity-0 hover:text-red-500 group-hover:opacity-100"
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={properties.length + 1}
                className="px-3 py-6 text-center text-muted"
              >
                No rows. Click “New” to add one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AddPropertyButton({
  databaseId,
  refresh,
}: {
  databaseId: string;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1 text-muted hover:bg-surface-hover hover:text-text"
        title="Add property"
      >
        <Plus size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-bg p-1 shadow-lg">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => {
                  addProperty(databaseId, t.type as PropertyType).then(refresh);
                  setOpen(false);
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
