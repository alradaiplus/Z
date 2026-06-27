import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-text">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-muted">
        This page may have been deleted or moved.
      </p>
      <Link href="/app" className="text-sm text-accent hover:underline">
        Back to your workspace
      </Link>
    </div>
  );
}
