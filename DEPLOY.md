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
| `DIRECT_URL` | Supabase **direct** connection string | Same page, "Session" / direct connection (port 5432). Used by Prisma for migrations only. |
| `AUTH_SECRET` | `3BlzUREJJ4LZqvNL+iWA71GheH3IOPkXY7AhlfjjUxE=` | Generated for this deploy — treat as a secret, don't reuse elsewhere. Or generate your own: `openssl rand -base64 32` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | *(leave unset)* | Only set this if you also deploy `scripts/collab-server.mjs` somewhere reachable over `wss://`; without it the app runs single-user (no live co-editing), everything else works. |

Set all four for the **Production** environment (and Preview, if you want
preview deploys to work against the same DB).

## 3. Apply the database schema to Supabase

The base schema plus four incremental migrations need to exist in the
Supabase Postgres database before the app can serve requests:

- Base schema: generate once with
  `npm run db:pg:ddl` (runs `prisma migrate diff --from-empty --to-schema-datamodel
  prisma/schema.postgres.prisma --script`) and run the output in the Supabase
  SQL Editor — **skip this step if you already provisioned the schema
  earlier** (it was set up once via Supabase MCP during development).
- Then run, **in order**, each file in `prisma/migrations-supabase/` (002 →
  005) in the Supabase SQL Editor. If a file errors with "already exists",
  that migration was already applied — skip it and move to the next.

If you're not sure what's already applied, open Supabase → Table Editor and
check whether `PasswordResetToken`, `DatabaseRow.pageId`, `PageVersion`, and
`WorkspaceMember` already exist; run only the migrations that don't.

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
