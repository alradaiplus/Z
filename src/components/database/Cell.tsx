"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  colorFor,
  type CellValue,
  type DbProperty,
  type SelectOption,
} from "@/lib/database";

export function SelectChip({ option }: { option: SelectOption }) {
  const c = colorFor(option.color);
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs"
      style={{ background: c.bg, color: c.fg }}
    >
      {option.name}
    </span>
  );
}

/**
 * Inline cell editor used by the table and gallery views. Saving happens on
 * blur/change; the parent persists via a server action.
 */
export function Cell({
  property,
  value,
  onChange,
  onCreateOption,
  compact,
}: {
  property: DbProperty;
  value: CellValue;
  onChange: (value: CellValue) => void;
  onCreateOption?: (name: string) => Promise<string>;
  compact?: boolean;
}) {
  const base = compact ? "text-sm" : "text-sm";

  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-accent"
      />
    );
  }

  if (property.type === "number") {
    return (
      <input
        type="number"
        defaultValue={value === null || value === undefined ? "" : String(value)}
        onBlur={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className={`w-full bg-transparent outline-none ${base}`}
      />
    );
  }

  if (property.type === "date") {
    return (
      <input
        type="date"
        defaultValue={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full bg-transparent outline-none ${base}`}
      />
    );
  }

  if (property.type === "select") {
    return (
      <SelectCell
        property={property}
        value={typeof value === "string" ? value : null}
        onChange={onChange}
        onCreateOption={onCreateOption}
      />
    );
  }

  // text
  return (
    <input
      type="text"
      defaultValue={typeof value === "string" ? value : ""}
      onBlur={(e) => onChange(e.target.value || null)}
      placeholder="Empty"
      className={`w-full bg-transparent outline-none placeholder:text-muted/50 ${base}`}
    />
  );
}

function SelectCell({
  property,
  value,
  onChange,
  onCreateOption,
}: {
  property: DbProperty;
  value: string | null;
  onChange: (value: CellValue) => void;
  onCreateOption?: (name: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = property.options.find((o) => o.id === value) ?? null;

  const matches = property.options.filter((o) =>
    o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const canCreate =
    query.trim() &&
    !property.options.some(
      (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
    );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[24px] w-full items-center text-left"
      >
        {current ? (
          <SelectChip option={current} />
        ) : (
          <span className="text-sm text-muted/50">Empty</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-bg p-1.5 shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or create…"
              className="mb-1.5 w-full rounded border border-border bg-surface px-2 py-1 text-sm outline-none"
            />
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mb-1 block w-full rounded px-2 py-1 text-left text-xs text-muted hover:bg-surface-hover"
            >
              Clear
            </button>
            {matches.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-surface-hover"
              >
                <SelectChip option={o} />
                {o.id === value && <Check size={14} />}
              </button>
            ))}
            {canCreate && onCreateOption && (
              <button
                onClick={async () => {
                  const id = await onCreateOption(query.trim());
                  onChange(id);
                  setQuery("");
                  setOpen(false);
                }}
                className="mt-1 block w-full rounded px-2 py-1 text-left text-sm hover:bg-surface-hover"
              >
                Create <span className="font-medium">{query.trim()}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
