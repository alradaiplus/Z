"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  type CellValue,
  type DbProperty,
  type DbRow,
  type ViewConfig,
} from "@/lib/database";
import type { SharedViewProps } from "./DatabaseView";
import { SelectChip } from "./Cell";

export function BoardView({
  properties,
  rows,
  onCellChange,
  onOpenRow,
  config,
  onChangeConfig,
}: SharedViewProps & {
  config: ViewConfig;
  onChangeConfig: (config: ViewConfig) => void;
}) {
  const selectProps = properties.filter((p) => p.type === "select");
  const groupProp =
    properties.find((p) => p.id === config.groupByPropertyId) ??
    selectProps[0] ??
    null;

  const nameProp =
    properties.find((p) => p.type === "text") ?? properties[0] ?? null;

  const [dragRow, setDragRow] = useState<string | null>(null);

  if (!groupProp) {
    return (
      <p className="text-sm text-muted">
        Add a <span className="font-medium">Select</span> property to group cards
        into a board.
      </p>
    );
  }

  // Columns: one per option, plus an "empty" column.
  const columns: { id: string | null; label: React.ReactNode }[] = [
    ...groupProp.options.map((o) => ({
      id: o.id,
      label: <SelectChip option={o} />,
    })),
    { id: null, label: <span className="text-sm text-muted">No {groupProp.name}</span> },
  ];

  const rowsFor = (optionId: string | null) =>
    rows.filter((r) => (r.cells[groupProp.id] ?? null) === optionId);

  const drop = (optionId: string | null) => {
    if (!dragRow) return;
    onCellChange(dragRow, groupProp.id, optionId as CellValue);
    setDragRow(null);
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
        <span>Group by</span>
        <select
          value={groupProp.id}
          onChange={(e) =>
            onChangeConfig({ ...config, groupByPropertyId: e.target.value })
          }
          className="rounded border border-border bg-surface px-2 py-1"
        >
          {selectProps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colRows = rowsFor(col.id);
          return (
            <div
              key={col.id ?? "__none__"}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(col.id)}
              className="w-64 flex-shrink-0 rounded-md bg-surface/60 p-2"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                {col.label}
                <span className="text-xs text-muted">{colRows.length}</span>
              </div>
              <div className="space-y-2">
                {colRows.map((row) => (
                  <Card
                    key={row.id}
                    row={row}
                    nameProp={nameProp}
                    properties={properties}
                    groupPropId={groupProp.id}
                    onDragStart={() => setDragRow(row.id)}
                    onOpen={() => onOpenRow(row.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  row,
  nameProp,
  properties,
  groupPropId,
  onDragStart,
  onOpen,
}: {
  row: DbRow;
  nameProp: DbProperty | null;
  properties: DbProperty[];
  groupPropId: string;
  onDragStart: () => void;
  onOpen: () => void;
}) {
  const name = nameProp
    ? String(row.cells[nameProp.id] ?? "")
    : "";
  const others = properties.filter(
    (p) => p.id !== nameProp?.id && p.id !== groupPropId,
  );

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group/card cursor-grab rounded-md border border-border bg-bg p-2.5 shadow-sm active:cursor-grabbing"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{name || "Untitled"}</span>
        <button
          onClick={onOpen}
          className="flex-shrink-0 rounded p-0.5 text-muted opacity-0 hover:bg-surface-hover hover:text-text group-hover/card:opacity-100"
          title="Open as page"
        >
          <Maximize2 size={13} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {others.map((p) => {
          const v = row.cells[p.id];
          if (v === null || v === undefined || v === "" || v === false) return null;
          if (p.type === "select") {
            const opt = p.options.find((o) => o.id === v);
            return opt ? <SelectChip key={p.id} option={opt} /> : null;
          }
          if (p.type === "checkbox") {
            return (
              <span key={p.id} className="text-xs text-muted">
                ✓ {p.name}
              </span>
            );
          }
          return (
            <span key={p.id} className="text-xs text-muted">
              {String(v)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
