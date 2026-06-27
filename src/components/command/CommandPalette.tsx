"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Database,
  Plus,
  Search,
  Tag,
  Moon,
  CornerDownLeft,
} from "lucide-react";
import { createPage, searchPages } from "@/app/app/actions";
import { createDatabasePage } from "@/app/app/database-actions";

type PageResult = { id: string; title: string; icon: string | null };

type Command = {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<PageResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Cmd/Ctrl-K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load page results (debounced) whenever the query changes while open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      startTransition(async () => setPages(await searchPages(query)));
    }, 120);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const close = () => setOpen(false);

  const go = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [router],
  );

  const commands = useMemo<Command[]>(() => {
    return [
      {
        id: "new-page",
        label: "New page",
        icon: <Plus size={16} />,
        run: () =>
          startTransition(async () => {
            const id = await createPage(null);
            go(`/app/${id}`);
          }),
      },
      {
        id: "new-database",
        label: "New database",
        icon: <Database size={16} />,
        run: () =>
          startTransition(async () => {
            const id = await createDatabasePage(null);
            go(`/app/${id}`);
          }),
      },
      {
        id: "search",
        label: "Search all pages",
        icon: <Search size={16} />,
        run: () => go("/app/search"),
      },
      {
        id: "tags",
        label: "Browse tags",
        icon: <Tag size={16} />,
        run: () => go("/app/tags"),
      },
      {
        id: "theme",
        label: "Toggle dark mode",
        icon: <Moon size={16} />,
        run: () => {
          const next = !document.documentElement.classList.contains("dark");
          document.documentElement.classList.toggle("dark", next);
          try {
            localStorage.setItem("z-theme", next ? "dark" : "light");
          } catch {
            /* ignore */
          }
          close();
        },
      },
    ];
  }, [go]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Flattened item list for keyboard navigation.
  const items = useMemo(
    () => [
      ...filteredCommands.map((c) => ({ kind: "command" as const, command: c })),
      ...pages.map((p) => ({ kind: "page" as const, page: p })),
    ],
    [filteredCommands, pages],
  );

  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(0, items.length - 1)));
  }, [items.length]);

  const activate = (index: number) => {
    const item = items[index];
    if (!item) return;
    if (item.kind === "command") item.command.run();
    else go(`/app/${item.page.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate(selected);
    }
  };

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or run a command…"
            className="w-full bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredCommands.length > 0 && (
            <Section label="Actions">
              {filteredCommands.map((c) => {
                runningIndex++;
                const idx = runningIndex;
                return (
                  <Item
                    key={c.id}
                    icon={c.icon}
                    label={c.label}
                    selected={idx === selected}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => activate(idx)}
                  />
                );
              })}
            </Section>
          )}

          {pages.length > 0 && (
            <Section label="Pages">
              {pages.map((p) => {
                runningIndex++;
                const idx = runningIndex;
                return (
                  <Item
                    key={p.id}
                    icon={p.icon ?? <FileText size={16} className="text-muted" />}
                    label={p.title || "Untitled"}
                    selected={idx === selected}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => activate(idx)}
                  />
                );
              })}
            </Section>
          )}

          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              No results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function Item({
  icon,
  label,
  selected,
  onMouseEnter,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      data-selected={selected}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm data-[selected=true]:bg-surface-hover"
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {selected && <CornerDownLeft size={14} className="text-muted" />}
    </button>
  );
}
