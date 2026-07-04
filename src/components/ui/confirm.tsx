"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A promise-based confirm dialog to replace the native `window.confirm`.
// Call `await confirmDialog({ title, ... })` anywhere; `<ConfirmHost/>` is
// mounted once in the root layout and renders the active request.

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let listener: ((r: Request | null) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) {
      // No host mounted (shouldn't happen) — fail closed.
      resolve(false);
      return;
    }
    listener({ ...options, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    listener = setReq;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  const finish = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  if (!mounted || !req) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
      onClick={() => finish(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-bg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-base font-semibold text-text">
          {req.title}
        </h2>
        {req.body && <p className="mt-2 text-sm text-muted">{req.body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => finish(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
          >
            {req.cancelLabel ?? "Cancel"}
          </button>
          <button
            autoFocus
            onClick={() => finish(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 ${
              req.danger ? "bg-red-600" : "bg-accent"
            }`}
          >
            {req.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
