"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Download, Upload, Check, Loader2 } from "lucide-react";
import { SlashCommand } from "./extensions/SlashCommand";
import { WikiLink, setWikiLinkTitles } from "./extensions/WikiLink";
import { savePageContent, renamePage, updatePageIcon } from "@/app/app/actions";
import { pmToMarkdown } from "@/lib/markdown";
import { markdownToPm } from "@/lib/markdown-import";

type SaveStatus = "idle" | "saving" | "saved";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function PageEditor({
  pageId,
  initialTitle,
  initialIcon,
  initialContent,
  knownTitles,
  backlinks,
}: {
  pageId: string;
  initialTitle: string;
  initialIcon: string | null;
  initialContent: string;
  knownTitles: string[];
  backlinks: React.ReactNode;
}) {
  const router = useRouter();
  // Refresh the known-titles holder synchronously so wikilink node views render
  // with correct resolved/unresolved styling on first paint.
  setWikiLinkTitles(knownTitles);
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    enableContentCheck: true,
    onContentError: ({ error }) =>
      console.error("Editor content failed to parse:", error),
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, '[[' to link a page…",
      }),
      SlashCommand,
      WikiLink,
    ],
    content: parseContentOrEmpty(initialContent),
    editorProps: {
      attributes: { class: "px-1 pb-24" },
    },
    onUpdate: ({ editor }) => {
      setStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void doSave(JSON.stringify(editor.getJSON()));
      }, 700);
    },
  });

  const doSave = useCallback(
    async (json: string) => {
      await savePageContent(pageId, json);
      setStatus("saved");
      // Refresh server components (backlinks / sidebar titles) without losing focus.
      router.refresh();
    },
    [pageId, router],
  );

  // Clear pending timers on unmount (component is keyed by pageId).
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, []);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void renamePage(pageId, value).then(() => router.refresh());
    }, 500);
  };

  const setEmoji = async () => {
    const value = window.prompt("Set an emoji icon (leave blank to remove):", icon ?? "");
    if (value === null) return;
    const next = value.trim() || null;
    setIcon(next);
    await updatePageIcon(pageId, next);
    router.refresh();
  };

  const exportMarkdown = () => {
    if (!editor) return;
    const md = `# ${title || "Untitled"}\n\n${pmToMarkdown(editor.getJSON())}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "untitled").replace(/[^\w-]+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMarkdown = async (file: File) => {
    if (!editor) return;
    const text = await file.text();
    // Use the first H1 as the page title if present.
    const h1 = /^#\s+(.+)$/m.exec(text);
    if (h1) onTitleChange(h1[1].trim());
    const doc = markdownToPm(text.replace(/^#\s+.+$\n?/m, ""));
    editor.commands.setContent(doc);
    setStatus("saving");
    await doSave(JSON.stringify(editor.getJSON()));
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={setEmoji}
          className="text-3xl leading-none hover:opacity-70"
          title="Set icon"
        >
          {icon ?? <span className="text-base text-muted">Add icon</span>}
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <SaveIndicator status={status} />
          <button
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-1 hover:text-text"
            title="Import Markdown"
          >
            <Upload size={14} /> Import
          </button>
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1 hover:text-text"
            title="Export Markdown"
          >
            <Download size={14} /> Export
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importMarkdown(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled"
        className="mb-4 w-full bg-transparent text-4xl font-bold outline-none placeholder:text-muted/50"
      />

      <EditorContent editor={editor} />

      <div className="mt-12 border-t border-border pt-6">{backlinks}</div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1">
        <Loader2 size={13} className="animate-spin" /> Saving
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1 text-green-500">
        <Check size={13} /> Saved
      </span>
    );
  return <span className="flex items-center gap-1">Synced</span>;
}

function parseContentOrEmpty(content: string): object {
  if (!content) return EMPTY_DOC;
  try {
    return JSON.parse(content);
  } catch {
    return EMPTY_DOC;
  }
}
