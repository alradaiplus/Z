// Builders for ProseMirror document JSON. Shared by the signup bootstrap and the
// Prisma seed script so new workspaces start with helpful, interlinked content
// that demonstrates blocks, wikilinks and backlinks.

type Node = Record<string, unknown>;

const text = (value: string, marks?: Node[]): Node =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };

const bold = (value: string): Node => text(value, [{ type: "bold" }]);
const code = (value: string): Node => text(value, [{ type: "code" }]);

const wikiLink = (label: string): Node => ({
  type: "wikiLink",
  attrs: { label },
});

const heading = (level: number, ...content: Node[]): Node => ({
  type: "heading",
  attrs: { level },
  content,
});

const paragraph = (...content: Node[]): Node =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };

const bullet = (...items: Node[][]): Node => ({
  type: "bulletList",
  content: items.map((c) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: c }],
  })),
});

const task = (checked: boolean, ...content: Node[]): Node => ({
  type: "taskItem",
  attrs: { checked },
  content: [{ type: "paragraph", content }],
});

const taskList = (...items: Node[]): Node => ({
  type: "taskList",
  content: items,
});

const codeBlock = (value: string): Node => ({
  type: "codeBlock",
  content: [text(value)],
});

const doc = (...content: Node[]): Node => ({ type: "doc", content });

export type SeedPage = {
  key: string;
  title: string;
  icon?: string;
  doc: Node;
};

/**
 * The starter pages created for every new workspace.
 * `key` is used only to build the parent/child relationships at insert time.
 */
export function defaultPages(): SeedPage[] {
  return [
    {
      key: "welcome",
      title: "Welcome to Z",
      icon: "👋",
      doc: doc(
        heading(1, text("Welcome to Z")),
        paragraph(
          text("Z combines the best of "),
          bold("Notion"),
          text(" (block editor, nested pages) and "),
          bold("Obsidian"),
          text(" (markdown, wikilinks, backlinks). Everything you type is saved to the cloud automatically.")
        ),
        heading(2, text("Try it out")),
        taskList(
          task(false, text("Type "), code("/"), text(" to open the block menu (headings, lists, code, todos…)")),
          task(false, text("Type "), code("[["), text(" to link to another page — try linking to "), wikiLink("Getting Started"), text("")),
          task(false, text("Open the "), wikiLink("Ideas"), text(" page and see this page appear in its backlinks")),
          task(false, text("Toggle dark mode from the sidebar header"))
        ),
        heading(2, text("Pages")),
        bullet(
          [wikiLink("Getting Started")],
          [wikiLink("Ideas")]
        )
      ),
    },
    {
      key: "getting-started",
      title: "Getting Started",
      icon: "🚀",
      doc: doc(
        heading(1, text("Getting Started")),
        paragraph(
          text("This page is linked from "),
          wikiLink("Welcome to Z"),
          text(". Scroll to the bottom to see the backlink.")
        ),
        heading(2, text("Blocks")),
        paragraph(text("Use the slash menu to insert any block:")),
        bullet(
          [text("Headings, bullet & numbered lists")],
          [text("To-do checklists, quotes, dividers")],
          [text("Code blocks with monospace formatting")]
        ),
        codeBlock("console.log('Hello from a code block');"),
        heading(2, text("Markdown")),
        paragraph(
          text("Type markdown shortcuts like "),
          code("# "),
          text(" for a heading or "),
          code("- "),
          text(" for a list and they convert as you type. You can also export any page to a .md file.")
        )
      ),
    },
    {
      key: "ideas",
      title: "Ideas",
      icon: "💡",
      doc: doc(
        heading(1, text("Ideas")),
        paragraph(
          text("A scratchpad. Linked from "),
          wikiLink("Welcome to Z"),
          text(".")
        ),
        taskList(
          task(false, text("Capture a thought")),
          task(true, text("Link related notes with [[wikilinks]]"))
        )
      ),
    },
  ];
}
