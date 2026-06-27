import Link from "next/link";
import { FileText, Link2 } from "lucide-react";

export type BacklinkRef = {
  id: string;
  title: string;
  icon: string | null;
  excerpt: string;
};

export function Backlinks({ links }: { links: BacklinkRef[] }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <Link2 size={15} />
        Linked references
        {links.length > 0 && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs">
            {links.length}
          </span>
        )}
      </h3>

      {links.length === 0 ? (
        <p className="text-sm text-muted">
          No backlinks yet. Reference this page with{" "}
          <code className="rounded bg-surface px-1 py-0.5">[[{"…"}]]</code> from
          another page.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id}>
              <Link
                href={`/app/${l.id}`}
                className="block rounded-md border border-border bg-surface px-3 py-2 transition hover:border-accent"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {l.icon ?? <FileText size={14} className="text-muted" />}
                  {l.title || "Untitled"}
                </span>
                {l.excerpt && (
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                    {l.excerpt}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
