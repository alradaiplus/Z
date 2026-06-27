"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag as TagIcon, X } from "lucide-react";
import { addTagToPage, removeTagFromPage } from "@/app/app/tag-actions";

type Tag = { id: string; name: string };

export function TagBar({
  pageId,
  initialTags,
}: {
  pageId: string;
  initialTags: Tag[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [, startTransition] = useTransition();

  const add = () => {
    const name = value.trim().replace(/^#/, "");
    setValue("");
    setAdding(false);
    if (!name || tags.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      return;
    startTransition(async () => {
      const tag = await addTagToPage(pageId, name);
      if (tag) setTags((prev) => [...prev, tag]);
      router.refresh();
    });
  };

  const remove = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    startTransition(async () => {
      await removeTagFromPage(pageId, tagId);
      router.refresh();
    });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="group flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted"
        >
          <TagIcon size={11} />
          {t.name}
          <button
            onClick={() => remove(t.id)}
            className="opacity-0 hover:text-red-500 group-hover:opacity-100"
          >
            <X size={11} />
          </button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
            if (e.key === "Escape") {
              setAdding(false);
              setValue("");
            }
          }}
          placeholder="tag name"
          className="w-24 rounded-full border border-border bg-surface px-2 py-0.5 text-xs outline-none"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted hover:bg-surface-hover"
        >
          <TagIcon size={11} /> Add tag
        </button>
      )}
    </div>
  );
}
