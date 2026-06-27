import { Share2 } from "lucide-react";
import { getGraphData } from "../graph-actions";
import { GraphCanvas } from "@/components/graph/GraphCanvas";

export default async function GraphPage() {
  const data = await getGraphData();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="font-display flex items-center gap-2 text-lg font-semibold">
          <Share2 size={18} /> Graph
        </h1>
        <span className="text-xs text-muted">
          {data.nodes.length} page{data.nodes.length === 1 ? "" : "s"} ·{" "}
          {data.links.length} link{data.links.length === 1 ? "" : "s"} · scroll
          to zoom, drag to pan, click a node to open
        </span>
      </div>

      {data.nodes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          No pages yet.
        </div>
      ) : (
        <GraphCanvas data={data} className="relative flex-1" />
      )}
    </div>
  );
}
