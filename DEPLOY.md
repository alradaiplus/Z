# Deploying Z to production

The dev sandbox that builds this app has no outbound network access to
Vercel or Supabase, so the steps below are done from your own browser/terminal
— each takes a minute.

## 1. Import the repo into Vercel

1. Go to https://vercel.com/new
2. Import `alradaiplus/z` from GitHub (installs the Vercel GitHub App on the
   repo if not already done — this also makes every future push auto-deploy).
3. Framework preset: **Next.js** (auto-detected). Build command is already set
   in `vercel.json` (`prisma generate --schema=prisma/schema.postgres.prisma
   && next build`), so leave it as-is.

## 2. Set environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string | Supabase dashboard → Project Settings → Database → Connection string → "Transaction" pooler (port 6543), append `?pgbouncer=true` |
| `AUTH_SECRET` | `3BlzUREJJ4LZqvNL+iWA71GheH3IOPkXY7AhlfjjUxE=` | Generated for this deploy — treat as a secret, don't reuse elsewhere. Or generate your own: `openssl rand -base64 32` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | *(leave unset)* | Only set this if you also deploy `scripts/collab-server.mjs` somewhere reachable over `wss://`; without it the app runs single-user (no live co-editing), everything else works. |

Set both required vars for the **Production** environment (and Preview, if you
want preview deploys to work against the same DB). `DIRECT_URL` is **not**
needed — the runtime schema no longer references it (migrations are applied
via the SQL editor, step 3).

## 3. Apply the database schema to Supabase

**Fresh database (most common):** open the Supabase **SQL Editor**, paste the
entire contents of `prisma/supabase-init.sql`, and run it once. That file
creates all 14 tables and is kept complete/current — nothing else to apply.

**Database created from an older version of this repo:** run, **in order**,
each file in `prisma/migrations-supabase/` (002 → 006) in the SQL Editor. If a
file errors with "already exists", that migration was already applied — skip
it and move to the next. To see what's missing, check the Table Editor for
`PasswordResetToken`, `DatabaseRow.pageId`, `PageVersion`, `WorkspaceMember`,
and `ImageAsset`.

## 4. Deploy

Click **Deploy** in Vercel. After it finishes, Vercel gives you a
`https://<project>.vercel.app` URL — that's the live app.

## 5. Verify

- Sign up for a new account at `/signup`.
- Create a page, use `/` for the slash menu, select text for the bubble menu.
- Reload / open on another device and confirm the page persists (that's sync
  working against Supabase).

## Ongoing deploys

Every push to `claude/full-notes-app-m5wlcx` (or whichever branch you set as
Vercel's production branch) triggers a new deploy automatically — no extra
steps needed after this first setup.
