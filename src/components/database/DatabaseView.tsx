"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table2, KanbanSquare, LayoutGrid, Plus } from "lucide-react";
import {
  applyView,
  parseProperties,
  parseRows,
  newId,
  type CellValue,
  type DbProperty,
  type DbRow,
  type DbView,
  type SelectOption,
  type ViewConfig,
  type ViewType,
} from "@/lib/database";
import {
  addRow,
  addView,
  deleteView,
  updateCell,
  updateProperty,
  updateView,
} from "@/app/app/database-actions";
import { renamePage } from "@/app/app/actions";
import { TableView } from "./TableView";
import { BoardView } from "./BoardView";
import { GalleryView } from "./GalleryView";
import { ViewControls } from "./ViewControls";

type RawProp = {
  id: string;
  name: string;
  type: string;
  options: string;
  order: number;
};
type RawRow = { id: string; cells: string; order: number };
type RawView = {
  id: string;
  name: string;
  type: string;
  config: string;
  order: number;
};

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Table2 size={14} />,
  board: <KanbanSquare size={14} />,
  gallery: <LayoutGrid size={14} />,
};

export function DatabaseView({
  pageId,
  databaseId,
  title,
  icon,
  tagBar,
  rawProperties,
  rawRows,
  rawViews,
}: {
  pageId: string;
  databaseId: string;
  title: string;
  icon: string | null;
  tagBar?: React.ReactNode;
  rawProperties: RawProp[];
  rawRows: RawRow[];
  rawViews: RawView[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pageTitle, setPageTitle] = useState(title);

  const properties = useMemo<DbProperty[]>(
    () => parseProperties(rawProperties),
    [rawProperties],
  );
  const rows = useMemo<DbRow[]>(() => parseRows(rawRows), [rawRows]);
  const views = useMemo<DbView[]>(
    () =>
      rawViews
        .map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type as ViewType,
          config: safeParse<ViewConfig>(v.config),
          order: v.order,
        }))
        .sort((a, b) => a.order - b.order),
    [rawViews],
  );

  const [activeViewId, setActiveViewId] = useState<string | undefined>(
    views[0]?.id,
  );
  const activeView =
    views.find((v) => v.id === activeViewId) ?? views[0];

  const visibleRows = useMemo(
    () => applyView(rows, properties, activeView?.config ?? {}),
    [rows, properties, activeView],
  );

  const refresh = () => router.refresh();

  // ---- mutation callbacks (server actions + refresh) -----------------------

  const onCellChange = (rowId: string, propertyId: string, value: CellValue) =>
    startTransition(async () => {
      await updateCell(rowId, propertyId, value);
      refresh();
    });

  const onCreateOption = async (
    propertyId: string,
    name: string,
  ): Promise<string> => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return "";
    const option: SelectOption = {
      id: newId(),
      name,
      color:
        ["blue", "green", "orange", "purple", "pink", "yellow", "red"][
          prop.options.length % 7
        ],
    };
    await updateProperty(propertyId, { options: [...prop.options, option] });
    refresh();
    return option.id;
  };

  const onAddRow = () =>
    startTransition(async () => {
      await addRow(databaseId);
      refresh();
    });

  const onTitleChange = (value: string) => {
    setPageTitle(value);
    startTransition(async () => {
      await renamePage(pageId, value);
      refresh();
    });
  };

  const onUpdateViewConfig = (config: ViewConfig) =>
    startTransition(async () => {
      if (!activeView) return;
      await updateView(activeView.id, { config });
      refresh();
    });

  const onAddView = (type: ViewType) =>
    startTransition(async () => {
      const id = await addView(databaseId, type);
      setActiveViewId(id);
      refresh();
    });

  const onDeleteView = () =>
    startTransition(async () => {
      if (!activeView || views.length <= 1) return;
      await deleteView(activeView.id);
      setActiveViewId(views.find((v) => v.id !== activeView.id)?.id);
      refresh();
    });

  const shared = {
    databaseId,
    properties,
    onCellChange,
    onCreateOption,
    refresh,
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-12">
      <div className="mb-1 text-3xl">{icon ?? "🗄️"}</div>
      <input
        value={pageTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled Database"
        className="mb-2 w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted/50"
      />

      {tagBar}

      {/* View tabs */}
      <div className="mb-3 flex items-center gap-1 border-b border-border">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveViewId(v.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm ${
              v.id === activeView?.id
                ? "border-text font-medium"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {VIEW_ICONS[v.type]}
            {v.name}
          </button>
        ))}
        <AddViewButton onAdd={onAddView} />
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeView && (
            <ViewControls
              properties={properties}
              config={activeView.config}
              onChange={onUpdateViewConfig}
            />
          )}
          {views.length > 1 && (
            <button
              onClick={onDeleteView}
              className="text-xs text-muted hover:text-red-500"
            >
              Delete view
            </button>
          )}
        </div>
        <button
          onClick={onAddRow}
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* Active view */}
      {activeView?.type === "table" && (
        <TableView {...shared} rows={visibleRows} />
      )}
      {activeView?.type === "board" && (
        <BoardView
          {...shared}
          rows={visibleRows}
          config={activeView.config}
          onChangeConfig={onUpdateViewConfig}
        />
      )}
      {activeView?.type === "gallery" && (
        <GalleryView {...shared} rows={visibleRows} />
      )}
    </div>
  );
}

function AddViewButton({ onAdd }: { onAdd: (t: ViewType) => void }) {
  const [open, setOpen] = useState(false);
  const types: { type: ViewType; label: string; icon: React.ReactNode }[] = [
    { type: "table", label: "Table", icon: VIEW_ICONS.table },
    { type: "board", label: "Board", icon: VIEW_ICONS.board },
    { type: "gallery", label: "Gallery", icon: VIEW_ICONS.gallery },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted hover:text-text"
      >
        <Plus size={14} /> Add view
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-bg p-1 shadow-lg">
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => {
                  onAdd(t.type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function safeParse<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return {} as T;
  }
}

export type SharedViewProps = {
  databaseId: string;
  properties: DbProperty[];
  rows: DbRow[];
  onCellChange: (rowId: string, propertyId: string, value: CellValue) => void;
  onCreateOption: (propertyId: string, name: string) => Promise<string>;
  refresh: () => void;
};
