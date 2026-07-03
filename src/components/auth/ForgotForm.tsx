"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-2xl font-extrabold text-white">
            Z
          </div>
          <h1 className="font-display text-xl font-semibold">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          {state.error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {state.error}
            </p>
          )}
          {state.notice && (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">
              {state.notice}
            </p>
          )}
          {state.devLink && (
            <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-accent">
              Dev only —{" "}
              <Link href={state.devLink} className="font-medium underline">
                open reset link
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
