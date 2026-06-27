import {
  Node,
  mergeAttributes,
  type Editor,
  type Range,
} from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveOrCreatePage, searchPages } from "@/app/app/actions";
import { normalizeTitle } from "@/lib/wikilinks";
import { createSuggestionRenderer } from "../suggestion/renderer";
import { WikiLinkMenu, type WikiLinkItem } from "../WikiLinkMenu";

export const wikiLinkPluginKey = new PluginKey("wikiLink");

// Module-level set of known (normalized) page titles, used by node views to
// render resolved vs. unresolved links. Only one page/editor is open at a time,
// and PageEditor refreshes this synchronously on render, so a shared holder is
// sufficient and avoids node-view re-render plumbing.
const knownTitles = new Set<string>();

export function setWikiLinkTitles(titles: string[]) {
  knownTitles.clear();
  for (const t of titles) knownTitles.add(normalizeTitle(t));
}

function WikiLinkView({ node }: NodeViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = (node.attrs.label as string) ?? "";
  const resolved = knownTitles.has(normalizeTitle(label));

  const open = () => {
    startTransition(async () => {
      const id = await resolveOrCreatePage(label);
      router.push(`/app/${id}`);
      router.refresh();
    });
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="wikilink"
        data-unresolved={!resolved}
        data-pending={pending}
        onClick={open}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") open();
        }}
      >
        {label}
      </span>
    </NodeViewWrapper>
  );
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label"),
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wikilink]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wikilink": "true",
        class: "wikilink",
      }),
      `[[${node.attrs.label}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.label}]]`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView);
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<WikiLinkItem>({
        editor: this.editor,
        pluginKey: wikiLinkPluginKey,
        char: "[[",
        allowSpaces: true,
        allowedPrefixes: null,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          insertWikiLink(editor, range, props.label);
        },
        items: async ({ query }) => {
          const pages = await searchPages(query);
          const items: WikiLinkItem[] = pages.map((p) => ({
            id: p.id,
            label: p.title,
            icon: p.icon,
            isNew: false,
          }));
          const q = query.trim();
          const exact = pages.some(
            (p) => normalizeTitle(p.title) === normalizeTitle(q),
          );
          if (q && !exact) {
            items.push({ id: "__new__", label: q, icon: null, isNew: true });
          }
          return items;
        },
        render: createSuggestionRenderer(WikiLinkMenu),
      }),
    ];
  },
});

function insertWikiLink(editor: Editor, range: Range, label: string) {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent([
      { type: "wikiLink", attrs: { label } },
      { type: "text", text: " " },
    ])
    .run();
}
