import Link from "next/link";
import { Tag } from "lucide-react";
import { listWorkspaceTags } from "../tag-actions";

export default async function TagsPage() {
  const tags = await listWorkspaceTags();

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Tag size={22} /> Tags
      </h1>

      {tags.length === 0 ? (
        <p className="text-sm text-muted">
          No tags yet. Add tags to a page from the bar under its title.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/app/tags/${encodeURIComponent(t.name)}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-accent"
            >
              <Tag size={13} className="text-muted" />
              {t.name}
              <span className="text-xs text-muted">{t.count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
