"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword, type AuthState } from "@/app/(auth)/actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPassword,
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
            Choose a new password
          </h1>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              New password
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          {state.error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Reset password"}
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
