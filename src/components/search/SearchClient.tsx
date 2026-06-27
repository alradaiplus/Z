"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Search as SearchIcon } from "lucide-react";
import { searchWorkspace } from "@/app/app/actions";

type Result = { id: string; title: string; icon: string | null; excerpt: string };

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchWorkspace(query));
      });
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
        <SearchIcon size={16} className="text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages by title or content…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <ul className="mt-4 space-y-2">
        {query && results.length === 0 && (
          <li className="text-sm text-muted">No results for “{query}”.</li>
        )}
        {results.map((r) => (
          <li key={r.id}>
            <Link
              href={`/app/${r.id}`}
              className="block rounded-md border border-border bg-surface px-3 py-2 hover:border-accent"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {r.icon ?? <FileText size={14} className="text-muted" />}
                {r.title || "Untitled"}
              </span>
              {r.excerpt && (
                <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                  {r.excerpt}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
