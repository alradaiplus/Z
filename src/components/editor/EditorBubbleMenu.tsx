"use client";

import { useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  Check,
  X,
} from "lucide-react";

// Selection bubble menu: appears when text is selected, giving quick inline
// formatting without reaching for the keyboard shortcuts. Link uses an inline
// input (no browser prompt).

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const openLink = () => {
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkMode(true);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkMode(false);
  };

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded hover:bg-surface-hover ${
      active ? "text-accent" : "text-text"
    }`;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={({ editor, from, to }) =>
        from !== to && !editor.isActive("image")
      }
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg p-1 shadow-xl">
        {linkMode ? (
          <div className="flex items-center gap-1 px-1">
            <input
              autoFocus
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") setLinkMode(false);
              }}
              placeholder="https://…"
              className="w-48 rounded border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-accent"
            />
            <button onClick={applyLink} className={btn(false)} title="Apply">
              <Check size={15} />
            </button>
            <button
              onClick={() => setLinkMode(false)}
              className={btn(false)}
              title="Cancel"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={btn(editor.isActive("bold"))}
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={btn(editor.isActive("italic"))}
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={btn(editor.isActive("strike"))}
              title="Strikethrough"
            >
              <Strikethrough size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={btn(editor.isActive("code"))}
              title="Inline code"
            >
              <Code size={15} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={btn(editor.isActive("highlight"))}
              title="Highlight"
            >
              <Highlighter size={15} />
            </button>
            <div className="mx-0.5 h-5 w-px bg-border" />
            <button
              onClick={openLink}
              className={btn(editor.isActive("link"))}
              title="Link"
            >
              <Link2 size={15} />
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
