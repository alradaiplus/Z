"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  PROPERTY_TYPES,
  SELECT_COLORS,
  colorFor,
  newId,
  type DbProperty,
  type PropertyType,
  type SelectOption,
} from "@/lib/database";
import {
  deleteProperty,
  updateProperty,
} from "@/app/app/database-actions";

const TYPE_ICON: Record<PropertyType, string> = {
  text: "T",
  number: "#",
  select: "▾",
  date: "📅",
  checkbox: "☑",
};

export function PropertyMenu({
  property,
  canDelete,
  refresh,
}: {
  property: DbProperty;
  canDelete: boolean;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-left text-xs font-medium text-muted hover:text-text"
      >
        <span className="text-[10px]">{TYPE_ICON[property.type]}</span>
        {property.name}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-md border border-border bg-bg p-2 shadow-lg">
            <input
              defaultValue={property.name}
              onBlur={(e) => {
                if (e.target.value.trim() !== property.name) {
                  updateProperty(property.id, { name: e.target.value }).then(refresh);
                }
              }}
              className="mb-2 w-full rounded border border-border bg-surface px-2 py-1 text-sm outline-none"
            />

            <label className="mb-2 block">
              <span className="mb-1 block text-[11px] uppercase text-muted">
                Type
              </span>
              <select
                defaultValue={property.type}
                onChange={(e) => {
                  updateProperty(property.id, {
                    type: e.target.value as PropertyType,
                  }).then(refresh);
                }}
                className="w-full rounded border border-border bg-surface px-2 py-1 text-sm outline-none"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {property.type === "select" && (
              <OptionEditor property={property} refresh={refresh} />
            )}

            {canDelete && (
              <button
                onClick={() => {
                  deleteProperty(property.id).then(refresh);
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-500 hover:bg-surface-hover"
              >
                <Trash2 size={13} /> Delete property
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OptionEditor({
  property,
  refresh,
}: {
  property: DbProperty;
  refresh: () => void;
}) {
  const [name, setName] = useState("");

  const save = (options: SelectOption[]) =>
    updateProperty(property.id, { options }).then(refresh);

  const add = () => {
    if (!name.trim()) return;
    const option: SelectOption = {
      id: newId(),
      name: name.trim(),
      color: SELECT_COLORS[property.options.length % SELECT_COLORS.length].name,
    };
    save([...property.options, option]);
    setName("");
  };

  return (
    <div className="mb-1">
      <span className="mb-1 block text-[11px] uppercase text-muted">Options</span>
      <div className="space-y-1">
        {property.options.map((o) => {
          const c = colorFor(o.color);
          return (
            <div key={o.id} className="flex items-center gap-1">
              <span
                className="flex-1 rounded px-2 py-0.5 text-xs"
                style={{ background: c.bg, color: c.fg }}
              >
                {o.name}
              </span>
              <select
                value={o.color}
                onChange={(e) =>
                  save(
                    property.options.map((x) =>
                      x.id === o.id ? { ...x, color: e.target.value } : x,
                    ),
                  )
                }
                className="rounded border border-border bg-surface px-1 py-0.5 text-xs"
              >
                {SELECT_COLORS.map((sc) => (
                  <option key={sc.name} value={sc.name}>
                    {sc.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  save(property.options.filter((x) => x.id !== o.id))
                }
                className="text-muted hover:text-red-500"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add option…"
          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs outline-none"
        />
        <button
          onClick={add}
          className="rounded bg-surface-hover px-2 text-xs hover:bg-border"
        >
          Add
        </button>
      </div>
    </div>
  );
}
