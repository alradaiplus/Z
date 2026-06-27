import { SearchClient } from "@/components/search/SearchClient";

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <h1 className="mb-4 text-2xl font-bold">Search</h1>
      <SearchClient />
    </div>
  );
}
