// Shared shape for sidebar page-tree nodes and a builder that turns the flat
// page list into a nested tree ordered by `order`.

export type TreeNode = {
  id: string;
  title: string;
  icon: string | null;
  children: TreeNode[];
};

type FlatPage = {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  order: number;
};

export function buildTree(pages: FlatPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of pages) {
    byId.set(p.id, { id: p.id, title: p.title, icon: p.icon, children: [] });
  }
  const roots: TreeNode[] = [];
  // Preserve order by iterating the already-sorted input.
  for (const p of pages) {
    const node = byId.get(p.id)!;
    if (p.parentId && byId.has(p.parentId)) {
      byId.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
