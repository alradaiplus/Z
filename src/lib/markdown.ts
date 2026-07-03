// Minimal ProseMirror-JSON -> Markdown serializer. Runs on the server to keep
// the `markdown` cache column in sync (used for export and, later, full-text
// search). The editor itself uses tiptap-markdown for live conversions.

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
};

function applyMarks(value: string, marks?: Mark[]): string {
  if (!marks?.length) return value;
  let out = value;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        out = `**${out}**`;
        break;
      case "italic":
        out = `*${out}*`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "";
        out = `[${out}](${href})`;
        break;
      }
    }
  }
  return out;
}

function serializeInline(nodes: Node[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") return applyMarks(node.text ?? "", node.marks);
      if (node.type === "wikiLink") return `[[${node.attrs?.label ?? ""}]]`;
      if (node.type === "hardBreak") return "\n";
      return "";
    })
    .join("");
}

function serializeList(node: Node, ordered: boolean, depth: number): string {
  const indent = "  ".repeat(depth);
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : "-";
      const inner = (item.content ?? [])
        .map((child) => serializeBlock(child, depth + 1))
        .join("\n")
        .trim();
      return `${indent}${marker} ${inner}`;
    })
    .join("\n");
}

function serializeTaskList(node: Node, depth: number): string {
  const indent = "  ".repeat(depth);
  return (node.content ?? [])
    .map((item) => {
      const checked = item.attrs?.checked ? "x" : " ";
      const inner = (item.content ?? [])
        .map((child) => serializeBlock(child, depth + 1))
        .join("\n")
        .trim();
      return `${indent}- [${checked}] ${inner}`;
    })
    .join("\n");
}

function serializeBlock(node: Node, depth = 0): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content);
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `${"#".repeat(level)} ${serializeInline(node.content)}`;
    }
    case "bulletList":
      return serializeList(node, false, depth);
    case "orderedList":
      return serializeList(node, true, depth);
    case "taskList":
      return serializeTaskList(node, depth);
    case "listItem":
      return (node.content ?? [])
        .map((child) => serializeBlock(child, depth))
        .join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${serializeBlock(child, depth)}`)
        .join("\n");
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      return `\`\`\`${lang}\n${serializeInline(node.content)}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "image":
      return `![${(node.attrs?.alt as string) ?? ""}](${(node.attrs?.src as string) ?? ""})`;
    default:
      return serializeInline(node.content);
  }
}

/**
 * Convert a ProseMirror document (object or JSON string) to Markdown.
 */
export function pmToMarkdown(doc: unknown): string {
  let parsed: Node | null = null;
  if (typeof doc === "string") {
    if (!doc) return "";
    try {
      parsed = JSON.parse(doc);
    } catch {
      return "";
    }
  } else {
    parsed = doc as Node;
  }
  if (!parsed?.content) return "";
  return parsed.content
    .map((node) => serializeBlock(node))
    .filter((s) => s !== undefined)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
