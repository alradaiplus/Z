"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { uploadImage } from "@/lib/upload-client";
import {
  Download,
  Upload,
  Check,
  Loader2,
  History,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import { HistoryPanel } from "./HistoryPanel";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { SlashCommand } from "./extensions/SlashCommand";
import { CodeBlock } from "./extensions/codeblock";
import { WikiLink, setWikiLinkTitles } from "./extensions/WikiLink";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { toast } from "@/components/ui/toast";
import { savePageContent, renamePage, updatePageIcon } from "@/app/app/actions";
import { pmToMarkdown } from "@/lib/markdown";
import { markdownToPm } from "@/lib/markdown-import";
import {
  COLLAB_WS_URL,
  collabEnabled,
  getCollabUser,
  roomName,
} from "@/lib/collab";
import { PresenceBar } from "./PresenceBar";

type SaveStatus = "idle" | "saving" | "saved";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function PageEditor({
  pageId,
  initialTitle,
  initialIcon,
  initialContent,
  knownTitles,
  collabToken,
  breadcrumb,
  tagBar,
  backlinks,
}: {
  pageId: string;
  initialTitle: string;
  initialIcon: string | null;
  initialContent: string;
  knownTitles: string[];
  collabToken?: string;
  breadcrumb?: React.ReactNode;
  tagBar?: React.ReactNode;
  backlinks: React.ReactNode;
}) {
  const router = useRouter();
  // Refresh the known-titles holder synchronously so wikilink node views render
  // with correct resolved/unresolved styling on first paint.
  setWikiLinkTitles(knownTitles);
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Set up the Yjs document + websocket provider once, only in collab mode.
  const collabRef = useRef<{
    ydoc: Y.Doc;
    provider: WebsocketProvider;
  } | null>(null);
  if (collabEnabled && !collabRef.current && typeof window !== "undefined") {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(COLLAB_WS_URL, roomName(pageId), ydoc, {
      // Signed token proving this user may join the room (verified server-side).
      params: collabToken ? { token: collabToken } : {},
    });
    const user = getCollabUser();
    provider.awareness.setLocalStateField("user", user);
    collabRef.current = { ydoc, provider };
  }
  const collab = collabRef.current;

  const editor = useEditor({
    immediatelyRender: false,
    enableContentCheck: true,
    onContentError: ({ error }) =>
      console.error("Editor content failed to parse:", error),
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Replaced by CodeBlockLowlight (syntax highlighting) below.
        codeBlock: false,
        // Yjs provides its own shared undo/redo history in collab mode.
        ...(collab ? { undoRedo: false } : {}),
      }),
      CodeBlock,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ HTMLAttributes: { class: "editor-image" } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "editor-link", rel: "noopener noreferrer" },
      }),
      Highlight,
      Placeholder.configure({
        placeholder: "Type '/' for commands, '[[' to link a page…",
      }),
      SlashCommand,
      WikiLink,
      ...(collab
        ? [
            Collaboration.configure({ document: collab.ydoc }),
            CollaborationCaret.configure({
              provider: collab.provider,
              user: getCollabUser(),
            }),
          ]
        : []),
    ],
    // In collab mode the Yjs doc is the source of content (seeded below).
    content: collab ? undefined : parseContentOrEmpty(initialContent),
    editorProps: {
      attributes: { class: "px-1 pb-24" },
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        event.preventDefault();
        void uploadAndInsert(view, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });
        if (pos) {
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.near(view.state.doc.resolve(pos.pos)),
            ),
          );
        }
        void uploadAndInsert(view, files);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      setStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void doSave(JSON.stringify(editor.getJSON()));
      }, 700);
    },
  });

  // Seed an empty collaborative room from the persisted DB content, once synced.
  useEffect(() => {
    if (!collab || !editor) return;
    const { ydoc, provider } = collab;
    const seed = () => {
      const fragment = ydoc.getXmlFragment("default");
      if (fragment.length === 0 && initialContent) {
        editor.commands.setContent(parseContentOrEmpty(initialContent));
      }
    };
    if (provider.synced) seed();
    else provider.once("sync", seed);
  }, [collab, editor, initialContent]);

  // Tear down the provider when leaving the page.
  useEffect(() => {
    return () => {
      if (collabRef.current) {
        collabRef.current.provider.destroy();
        collabRef.current.ydoc.destroy();
        collabRef.current = null;
      }
    };
  }, []);

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

  // Close the header ••• menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void renamePage(pageId, value).then(() => router.refresh());
    }, 500);
  };

  const onIconPick = async (next: string | null) => {
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
    toast.success("Markdown imported");
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      {breadcrumb}
      <div className="mb-2 flex items-center justify-between">
        <EmojiPicker
          value={icon}
          onPick={onIconPick}
          className="text-3xl leading-none hover:opacity-70"
        />
        <div className="flex items-center gap-3 text-xs text-muted">
          {collab && <PresenceBar provider={collab.provider} />}
          <SaveIndicator status={status} />
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1 rounded p-1 hover:bg-surface-hover hover:text-text"
              title="More"
              aria-label="Page options"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-[120] mt-1 w-44 rounded-lg border border-border bg-bg p-1 text-sm shadow-2xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    fileInput.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-text hover:bg-surface-hover"
                >
                  <Upload size={14} /> Import Markdown
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    exportMarkdown();
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-text hover:bg-surface-hover"
                >
                  <Download size={14} /> Export Markdown
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setHistoryOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-text hover:bg-surface-hover"
                >
                  <History size={14} /> Version history
                </button>
              </div>
            )}
          </div>
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
        className="font-display mb-2 w-full bg-transparent text-4xl font-bold outline-none placeholder:text-muted/50"
      />

      {tagBar}

      {editor && <EditorBubbleMenu editor={editor} />}
      {editor && (
        <DragHandle editor={editor}>
          <div className="flex h-6 w-4 cursor-grab items-center justify-center rounded text-muted hover:bg-surface-hover active:cursor-grabbing">
            <GripVertical size={14} />
          </div>
        </DragHandle>
      )}

      <EditorContent editor={editor} />

      <div className="mt-12 border-t border-border pt-6">{backlinks}</div>

      {historyOpen && (
        <HistoryPanel
          pageId={pageId}
          onClose={() => setHistoryOpen(false)}
          onRestore={(v) => {
            editor?.commands.setContent(parseContentOrEmpty(v.content));
            setTitle(v.title);
            router.refresh();
          }}
        />
      )}
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

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}

/** Upload dropped/pasted images and insert them at the current selection. */
async function uploadAndInsert(view: EditorView, files: File[]) {
  for (const file of files) {
    try {
      const url = await uploadImage(file);
      const node = view.state.schema.nodes.image.create({ src: url });
      view.dispatch(view.state.tr.replaceSelectionWith(node));
    } catch (e) {
      console.error("Image upload failed:", e);
    }
  }
}
