"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, AlertCircle, Info, X } from "lucide-react";

// A tiny dependency-free toast system. A module-level store lets any code call
// `toast("Saved")` without threading a context through props; `<Toaster/>` is
// mounted once in the root layout and renders the queue.

export type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

let counter = 0;
let toasts: Toast[] = [];
const listeners = new Set<(t: Toast[]) => void>();

function emit() {
  listeners.forEach((l) => l(toasts));
}

export function toast(message: string, kind: ToastKind = "info") {
  const id = ++counter;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => dismiss(id), 4000);
  return id;
}
toast.success = (m: string) => toast(m, "success");
toast.error = (m: string) => toast(m, "error");
toast.info = (m: string) => toast(m, "info");

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const ICONS = {
  success: <Check size={16} className="text-green-500" />,
  error: <AlertCircle size={16} className="text-red-500" />,
  info: <Info size={16} className="text-accent" />,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>(toasts);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm shadow-lg"
          role="status"
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.kind]}</span>
          <span className="min-w-0 flex-1 break-words text-text">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-0.5 text-muted hover:bg-surface-hover hover:text-text"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
