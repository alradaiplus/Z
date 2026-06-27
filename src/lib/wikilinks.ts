// Helpers for extracting and normalizing [[wikilinks]] from a ProseMirror
// document. Wikilinks are stored as an inline node of type "wikiLink" with a
// `label` attribute holding the referenced page title.

type PMNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

/**
 * Normalize a page title for case-insensitive matching of wikilink targets.
 */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Walk a ProseMirror document JSON and return the set of unique wikilink
 * labels it references.
 */
export function extractWikiLinks(doc: unknown): string[] {
  const labels = new Set<string>();

  const visit = (node: PMNode | undefined) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "wikiLink") {
      const label = node.attrs?.label;
      if (typeof label === "string" && label.trim()) {
        labels.add(label.trim());
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  };

  visit(doc as PMNode);
  return Array.from(labels);
}

/**
 * Safely parse a stored content string (ProseMirror JSON) into an object.
 * Returns null for empty/invalid content.
 */
export function parseContent(content: string): unknown {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
