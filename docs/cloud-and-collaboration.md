# Cloud (Supabase Postgres) & Realtime Collaboration

Phase 4 makes Z deployable with a hosted Postgres database and live multi-user
editing. Both are **opt-in via environment variables**, so local development
keeps working with SQLite and single-user editing by default.

## 1. Cloud database (Supabase / Neon Postgres)

The app uses Prisma. `prisma/schema.prisma` targets SQLite for local dev;
`prisma/schema.postgres.prisma` is the identical model set targeting Postgres.

**Provision the schema:** the Prisma-compatible DDL is generated at
`prisma/supabase-init.sql` (regenerate with `npm run db:pg:ddl`). Apply it to a
fresh Supabase project (SQL editor, `supabase db push`, or the Supabase MCP
`apply_migration`).

**Point the app at it:**

```env
DATABASE_URL="postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true"  # pooled
DIRECT_URL="postgresql://USER:PASS@HOST:5432/postgres"                   # migrations
```

Generate the client from the Postgres schema and start:

```bash
prisma generate --schema prisma/schema.postgres.prisma
```

> Note: the data access layer is unchanged — the same Prisma models map to both
> engines, so no application code changes are needed to switch.

## 2. Realtime collaboration (Yjs)

Editing is backed by a Yjs CRDT when `NEXT_PUBLIC_COLLAB_WS_URL` is set:

- `@tiptap/extension-collaboration` binds the editor to a shared `Y.Doc`.
- `@tiptap/extension-collaboration-caret` renders remote cursors + name labels.
- A `y-websocket` provider syncs the doc; presence avatars come from awareness.
- The DB row's ProseMirror JSON remains the durable store (autosaved); the Yjs
  room is the live layer, seeded from the DB when first opened.

**Local dev / verification:**

```bash
npm run collab                       # starts the Yjs websocket server on :1234
NEXT_PUBLIC_COLLAB_WS_URL=ws://localhost:1234 npm run build && npm start
```

Open the same page in two browsers — edits and cursors sync live. With the var
unset, the editor falls back to single-user mode with local undo/redo.

**Production:** run `scripts/collab-server.mjs` as a standalone Node service
(any host that allows long-lived websockets — not Vercel serverless) and set
`NEXT_PUBLIC_COLLAB_WS_URL=wss://your-collab-host`. A hosted provider
(Liveblocks, Hocuspocus, PartyKit, or Supabase Realtime via a y-provider) can be
swapped in without touching the editor code.
