// Shared types and pure helpers for Notion-style databases. No server-only
// imports so this can run on both client and server (filtering/sorting happen
// client-side for snappy view switching).

export type PropertyType = "text" | "number" | "select" | "date" | "checkbox";

export const PROPERTY_TYPES: { type: PropertyType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "number", label: "Number" },
  { type: "select", label: "Select" },
  { type: "date", label: "Date" },
  { type: "checkbox", label: "Checkbox" },
];

export type SelectOption = { id: string; name: string; color: string };

export type CellValue = string | number | boolean | null;

export type DbProperty = {
  id: string;
  name: string;
  type: PropertyType;
  options: SelectOption[];
  order: number;
};

export type DbRow = {
  id: string;
  order: number;
  cells: Record<string, CellValue>;
};

export type ViewType = "table" | "board" | "gallery";

export type FilterOp =
  | "contains"
  | "equals"
  | "notEquals"
  | "gt"
  | "lt"
  | "isEmpty"
  | "isNotEmpty"
  | "isChecked"
  | "isNotChecked";

export type Filter = {
  propertyId: string;
  op: FilterOp;
  value: CellValue;
};

export type Sort = {
  propertyId: string;
  direction: "asc" | "desc";
};

export type ViewConfig = {
  filters?: Filter[];
  sorts?: Sort[];
  groupByPropertyId?: string;
};

export type DbView = {
  id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  order: number;
};

// Color palette for select options (maps to inline styles to avoid Tailwind purge issues).
export const SELECT_COLORS: { name: string; bg: string; fg: string }[] = [
  { name: "gray", bg: "#e3e2e0", fg: "#32302c" },
  { name: "brown", bg: "#eee0da", fg: "#5c3b2e" },
  { name: "orange", bg: "#fadec9", fg: "#69391f" },
  { name: "yellow", bg: "#fdecc8", fg: "#665018" },
  { name: "green", bg: "#dbeddb", fg: "#1c3829" },
  { name: "blue", bg: "#d3e5ef", fg: "#183347" },
  { name: "purple", bg: "#e8deee", fg: "#412454" },
  { name: "pink", bg: "#f5e0e9", fg: "#5b223a" },
  { name: "red", bg: "#ffe2dd", fg: "#6e3630" },
];

export function colorFor(name: string) {
  return SELECT_COLORS.find((c) => c.name === name) ?? SELECT_COLORS[0];
}

export function parseProperties(
  raw: { id: string; name: string; type: string; options: string; order: number }[],
): DbProperty[] {
  return raw
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type as PropertyType,
      options: safeJson<SelectOption[]>(p.options, []),
      order: p.order,
    }))
    .sort((a, b) => a.order - b.order);
}

export function parseRows(
  raw: { id: string; cells: string; order: number }[],
): DbRow[] {
  return raw
    .map((r) => ({
      id: r.id,
      order: r.order,
      cells: safeJson<Record<string, CellValue>>(r.cells, {}),
    }))
    .sort((a, b) => a.order - b.order);
}

export function parseView(raw: {
  id: string;
  name: string;
  type: string;
  config: string;
  order: number;
}): DbView {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type as ViewType,
    config: safeJson<ViewConfig>(raw.config, {}),
    order: raw.order,
  };
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isEmpty(v: CellValue): boolean {
  return v === null || v === undefined || v === "" || v === false;
}

function matchesFilter(row: DbRow, filter: Filter): boolean {
  const v = row.cells[filter.propertyId] ?? null;
  switch (filter.op) {
    case "contains":
      return String(v ?? "").toLowerCase().includes(String(filter.value ?? "").toLowerCase());
    case "equals":
      return String(v ?? "") === String(filter.value ?? "");
    case "notEquals":
      return String(v ?? "") !== String(filter.value ?? "");
    case "gt":
      return Number(v) > Number(filter.value);
    case "lt":
      return Number(v) < Number(filter.value);
    case "isEmpty":
      return isEmpty(v);
    case "isNotEmpty":
      return !isEmpty(v);
    case "isChecked":
      return v === true;
    case "isNotChecked":
      return v !== true;
    default:
      return true;
  }
}

/**
 * Apply a view's filters and sorts to the rows. Pure — safe to memoize.
 */
export function applyView(
  rows: DbRow[],
  properties: DbProperty[],
  config: ViewConfig,
): DbRow[] {
  let out = rows;

  for (const filter of config.filters ?? []) {
    out = out.filter((row) => matchesFilter(row, filter));
  }

  const sorts = config.sorts ?? [];
  if (sorts.length) {
    const typeById = new Map(properties.map((p) => [p.id, p.type]));
    out = [...out].sort((a, b) => {
      for (const sort of sorts) {
        const type = typeById.get(sort.propertyId);
        const av = a.cells[sort.propertyId] ?? null;
        const bv = b.cells[sort.propertyId] ?? null;
        let cmp = 0;
        if (type === "number") {
          cmp = Number(av) - Number(bv);
        } else if (type === "checkbox") {
          cmp = (av === true ? 1 : 0) - (bv === true ? 1 : 0);
        } else {
          cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        }
        if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
      }
      return a.order - b.order;
    });
  }

  return out;
}

export function newId(prefix = "opt"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
