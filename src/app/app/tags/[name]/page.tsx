import Link from "next/link";
import { FileText, Tag } from "lucide-react";
import { getTaggedPages } from "../../tag-actions";

export default async function TagPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const tagName = decodeURIComponent(name);
  const pages = await getTaggedPages(tagName);

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <Link href="/app/tags" className="text-xs text-muted hover:underline">
        ← All tags
      </Link>
      <h1 className="mb-6 mt-2 flex items-center gap-2 text-2xl font-bold">
        <Tag size={22} /> {tagName}
      </h1>

      {pages.length === 0 ? (
        <p className="text-sm text-muted">No pages with this tag.</p>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/${p.id}`}
                className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-accent"
              >
                {p.icon ?? <FileText size={15} className="text-muted" />}
                {p.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
