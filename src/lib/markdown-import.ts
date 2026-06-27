// Lightweight Markdown -> ProseMirror JSON converter. Covers the block and
// inline syntax that the export serializer (markdown.ts) produces, plus
// [[wikilinks]], so round-tripping a page through .md is lossless for common
// content. Runs on the client (import) and is intentionally dependency-free.

type Node = Record<string, unknown>;

const INLINE_PATTERNS: {
  re: RegExp;
  build: (m: RegExpExecArray) => Node;
}[] = [
  // Order matters: wikilink and code before emphasis so their contents aren't reparsed.
  { re: /\[\[([^\]]+)\]\]/, build: (m) => ({ type: "wikiLink", attrs: { label: m[1] } }) },
  { re: /`([^`]+)`/, build: (m) => ({ type: "text", text: m[1], marks: [{ type: "code" }] }) },
  { re: /\*\*([^*]+)\*\*/, build: (m) => ({ type: "text", text: m[1], marks: [{ type: "bold" }] }) },
  { re: /\*([^*]+)\*/, build: (m) => ({ type: "text", text: m[1], marks: [{ type: "italic" }] }) },
  { re: /__([^_]+)__/, build: (m) => ({ type: "text", text: m[1], marks: [{ type: "bold" }] }) },
  { re: /~~([^~]+)~~/, build: (m) => ({ type: "text", text: m[1], marks: [{ type: "strike" }] }) },
  {
    re: /\[([^\]]+)\]\(([^)]+)\)/,
    build: (m) => ({
      type: "text",
      text: m[1],
      marks: [{ type: "link", attrs: { href: m[2] } }],
    }),
  },
];

function parseInline(text: string): Node[] {
  if (!text) return [];
  // Find the earliest matching inline pattern, recurse on the surrounding text.
  let best: { index: number; length: number; node: Node } | null = null;
  for (const { re, build } of INLINE_PATTERNS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) {
      best = { index: m.index, length: m[0].length, node: build(m) };
    }
  }
  if (!best) return [{ type: "text", text }];

  const before = text.slice(0, best.index);
  const after = text.slice(best.index + best.length);
  return [
    ...(before ? [{ type: "text", text: before }] : []),
    best.node,
    ...parseInline(after),
  ];
}

const inlineParagraph = (text: string): Node => {
  const content = parseInline(text);
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
};

export function markdownToPm(markdown: string): Node {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Node[] = [];
  let i = 0;

  const flushList = (
    items: Node[],
    type: "bulletList" | "orderedList" | "taskList",
  ) => {
    if (items.length) blocks.push({ type, content: items });
  };

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || null;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({
        type: "codeBlock",
        attrs: { language: lang },
        content: buf.length ? [{ type: "text", text: buf.join("\n") }] : [],
      });
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        content: [inlineParagraph(buf.join(" "))],
      });
      continue;
    }

    // Task list
    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: Node[] = [];
      while (i < lines.length && /^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i])!;
        items.push({
          type: "taskItem",
          attrs: { checked: m[1].toLowerCase() === "x" },
          content: [inlineParagraph(m[2])],
        });
        i++;
      }
      flushList(items, "taskList");
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: Node[] = [];
      while (
        i < lines.length &&
        /^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*[-*]\s+\[[ xX]\]\s+/.test(lines[i])
      ) {
        const m = /^\s*[-*]\s+(.*)$/.exec(lines[i])!;
        items.push({
          type: "listItem",
          content: [inlineParagraph(m[1])],
        });
        i++;
      }
      flushList(items, "bulletList");
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: Node[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const m = /^\s*\d+\.\s+(.*)$/.exec(lines[i])!;
        items.push({
          type: "listItem",
          content: [inlineParagraph(m[1])],
        });
        i++;
      }
      flushList(items, "orderedList");
      continue;
    }

    // Paragraph (collect consecutive non-blank, non-special lines)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(inlineParagraph(buf.join(" ")));
  }

  return { type: "doc", content: blocks.length ? blocks : [{ type: "paragraph" }] };
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)
  );
}
