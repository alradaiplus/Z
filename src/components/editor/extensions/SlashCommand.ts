import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  TextQuote,
  Code,
  Minus,
  Type,
} from "lucide-react";
import { createElement, type ReactNode } from "react";
import { createSuggestionRenderer } from "../suggestion/renderer";
import { SlashMenu } from "../SlashMenu";

export type SlashItem = {
  title: string;
  description: string;
  icon: ReactNode;
  keywords: string[];
  action: (editor: Editor, range: Range) => void;
};

const icon = (Comp: typeof Type) => createElement(Comp, { size: 16 });

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    icon: icon(Type),
    keywords: ["paragraph", "text", "plain"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Big section heading",
    icon: icon(Heading1),
    keywords: ["h1", "title", "heading"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: icon(Heading2),
    keywords: ["h2", "subtitle", "heading"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: icon(Heading3),
    keywords: ["h3", "heading"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: icon(List),
    keywords: ["bullet", "unordered", "ul", "list"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: icon(ListOrdered),
    keywords: ["numbered", "ordered", "ol", "list"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    description: "Checklist with checkboxes",
    icon: icon(ListChecks),
    keywords: ["todo", "task", "checkbox", "checklist"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Blockquote",
    icon: icon(TextQuote),
    keywords: ["quote", "blockquote", "callout"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Monospace code block",
    icon: icon(Code),
    keywords: ["code", "snippet", "pre"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: icon(Minus),
    keywords: ["divider", "hr", "rule", "separator"],
    action: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

export const slashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        pluginKey: slashCommandPluginKey,
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.action(editor, range);
        },
        items: ({ query }) => {
          const q = query.toLowerCase();
          return SLASH_ITEMS.filter(
            (item) =>
              !q ||
              item.title.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.includes(q)),
          );
        },
        render: createSuggestionRenderer(SlashMenu),
      }),
    ];
  },
});
