"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="font-display text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted">
        This page hit an unexpected error. Your data is safe — try again.
      </p>
      <button
        onClick={reset}
        className="mt-1 flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <RotateCcw size={15} /> Try again
      </button>
    </div>
  );
}
