"use client";

import { useState } from "react";
import { SlidersHorizontal, ArrowUpDown, Plus, X } from "lucide-react";
import {
  type DbProperty,
  type Filter,
  type FilterOp,
  type PropertyType,
  type Sort,
  type ViewConfig,
} from "@/lib/database";

const OPS_BY_TYPE: Record<PropertyType, { op: FilterOp; label: string }[]> = {
  text: [
    { op: "contains", label: "contains" },
    { op: "equals", label: "is" },
    { op: "isNotEmpty", label: "is not empty" },
    { op: "isEmpty", label: "is empty" },
  ],
  number: [
    { op: "equals", label: "=" },
    { op: "gt", label: ">" },
    { op: "lt", label: "<" },
  ],
  select: [
    { op: "equals", label: "is" },
    { op: "notEquals", label: "is not" },
    { op: "isEmpty", label: "is empty" },
  ],
  date: [
    { op: "equals", label: "is" },
    { op: "gt", label: "after" },
    { op: "lt", label: "before" },
  ],
  checkbox: [
    { op: "isChecked", label: "is checked" },
    { op: "isNotChecked", label: "is unchecked" },
  ],
};

const NO_VALUE: FilterOp[] = ["isEmpty", "isNotEmpty", "isChecked", "isNotChecked"];

export function ViewControls({
  properties,
  config,
  onChange,
}: {
  properties: DbProperty[];
  config: ViewConfig;
  onChange: (config: ViewConfig) => void;
}) {
  const filters = config.filters ?? [];
  const sorts = config.sorts ?? [];

  return (
    <div className="flex items-center gap-1">
      <Popover
        label="Filter"
        icon={<SlidersHorizontal size={13} />}
        count={filters.length}
      >
        <FilterEditor
          properties={properties}
          filters={filters}
          onChange={(f) => onChange({ ...config, filters: f })}
        />
      </Popover>

      <Popover label="Sort" icon={<ArrowUpDown size={13} />} count={sorts.length}>
        <SortEditor
          properties={properties}
          sorts={sorts}
          onChange={(s) => onChange({ ...config, sorts: s })}
        />
      </Popover>
    </div>
  );
}

function Popover({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
          count > 0 ? "text-accent" : "text-muted hover:text-text"
        }`}
      >
        {icon}
        {label}
        {count > 0 && <span>({count})</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-md border border-border bg-bg p-2 shadow-lg">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function FilterEditor({
  properties,
  filters,
  onChange,
}: {
  properties: DbProperty[];
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
}) {
  const update = (i: number, patch: Partial<Filter>) =>
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const propById = (id: string) => properties.find((p) => p.id === id);

  return (
    <div className="space-y-2">
      {filters.length === 0 && (
        <p className="px-1 text-xs text-muted">No filters yet.</p>
      )}
      {filters.map((f, i) => {
        const prop = propById(f.propertyId);
        const ops = prop ? OPS_BY_TYPE[prop.type] : OPS_BY_TYPE.text;
        const needsValue = !NO_VALUE.includes(f.op);
        return (
          <div key={i} className="flex flex-wrap items-center gap-1">
            <select
              value={f.propertyId}
              onChange={(e) => {
                const np = propById(e.target.value);
                update(i, {
                  propertyId: e.target.value,
                  op: np ? OPS_BY_TYPE[np.type][0].op : "contains",
                  value: null,
                });
              }}
              className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={f.op}
              onChange={(e) => update(i, { op: e.target.value as FilterOp })}
              className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
            >
              {ops.map((o) => (
                <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              ))}
            </select>
            {needsValue &&
              (prop?.type === "select" ? (
                <select
                  value={String(f.value ?? "")}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
                >
                  <option value="">—</option>
                  {prop.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    prop?.type === "number"
                      ? "number"
                      : prop?.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={String(f.value ?? "")}
                  onChange={(e) => update(i, { value: e.target.value })}
                  className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs"
                />
              ))}
            <button
              onClick={() => onChange(filters.filter((_, idx) => idx !== i))}
              className="text-muted hover:text-red-500"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <button
        onClick={() =>
          onChange([
            ...filters,
            {
              propertyId: properties[0]?.id ?? "",
              op: properties[0]
                ? OPS_BY_TYPE[properties[0].type][0].op
                : "contains",
              value: null,
            },
          ])
        }
        className="flex items-center gap-1 rounded px-1 py-1 text-xs text-muted hover:text-text"
      >
        <Plus size={13} /> Add filter
      </button>
    </div>
  );
}

function SortEditor({
  properties,
  sorts,
  onChange,
}: {
  properties: DbProperty[];
  sorts: Sort[];
  onChange: (sorts: Sort[]) => void;
}) {
  const update = (i: number, patch: Partial<Sort>) =>
    onChange(sorts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      {sorts.length === 0 && (
        <p className="px-1 text-xs text-muted">No sorts yet.</p>
      )}
      {sorts.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <select
            value={s.propertyId}
            onChange={(e) => update(i, { propertyId: e.target.value })}
            className="flex-1 rounded border border-border bg-surface px-1.5 py-1 text-xs"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={s.direction}
            onChange={(e) =>
              update(i, { direction: e.target.value as "asc" | "desc" })
            }
            className="rounded border border-border bg-surface px-1.5 py-1 text-xs"
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button
            onClick={() => onChange(sorts.filter((_, idx) => idx !== i))}
            className="text-muted hover:text-red-500"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...sorts,
            { propertyId: properties[0]?.id ?? "", direction: "asc" },
          ])
        }
        className="flex items-center gap-1 rounded px-1 py-1 text-xs text-muted hover:text-text"
      >
        <Plus size={13} /> Add sort
      </button>
    </div>
  );
}
