import { Trash2 } from "lucide-react";
import { listArchivedPages } from "../actions";
import { TrashClient } from "@/components/trash/TrashClient";

export default async function TrashPage() {
  const pages = await listArchivedPages();
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="font-display mb-1 flex items-center gap-2 text-2xl font-bold">
        <Trash2 size={22} /> Trash
      </h1>
      <p className="mb-6 text-sm text-muted">
        Archived pages. Restore them, or delete permanently.
      </p>
      <TrashClient pages={pages} />
    </div>
  );
}
