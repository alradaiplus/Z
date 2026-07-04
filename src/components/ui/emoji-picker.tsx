"use client";

import { useEffect, useRef, useState } from "react";

// A small emoji picker popover to replace `window.prompt` for the page icon.
// Curated list grouped loosely by theme; enough for notes/docs without a heavy
// emoji-data dependency.

const EMOJIS = [
  "📄", "📝", "📓", "📔", "📕", "📗", "📘", "📙", "📚", "🗒️", "📋", "🗂️",
  "📁", "📂", "🗃️", "🔖", "🏷️", "✏️", "🖊️", "🖋️", "✒️", "🔗", "📌", "📎",
  "💡", "🔥", "⭐", "🌟", "✨", "🎯", "🚀", "🧠", "❤️", "✅", "☑️", "🎨",
  "📊", "📈", "📉", "🗓️", "📅", "⏰", "⚡", "🔔", "🎵", "🎬", "🎮", "🍀",
  "🌱", "🌍", "☀️", "🌙", "⛅", "🏠", "🏢", "🧩", "🔒", "🔑", "⚙️", "🛠️",
  "💰", "💼", "🎓", "🧪", "🔬", "🩺", "🍎", "☕", "🥗", "🐛", "🦄", "🎉",
];

export function EmojiPicker({
  value,
  onPick,
  className,
  title,
}: {
  value: string | null;
  onPick: (emoji: string | null) => void;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={className}
        title={title ?? "Set icon"}
        type="button"
      >
        {value ?? <span className="text-base text-muted">Add icon</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[120] mt-2 w-[272px] rounded-xl border border-border bg-bg p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Pick an icon</span>
            <button
              onClick={() => {
                onPick(null);
                setOpen(false);
              }}
              className="text-xs text-muted hover:text-red-500"
              type="button"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onPick(e);
                  setOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-surface-hover"
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
