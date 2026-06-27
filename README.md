# Z — a Notion + Obsidian notes app

Z combines the **block-based editor and nested pages of Notion** with the
**markdown, `[[wikilinks]]`, and backlinks of Obsidian**, backed by a cloud
database so your notes sync across devices.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **TipTap** (ProseMirror) editor — blocks, slash commands, and a custom
  `[[wikilink]]` node
- **Prisma** ORM — SQLite for local dev, promotes to Postgres (Supabase / Neon)
  for production sync
- **Tailwind CSS** with light/dark themes
- Lightweight cookie/JWT auth (`jose` + `bcryptjs`)

## Features (Phase 1)

- Email/password accounts; one workspace per user
- Nested page tree in the sidebar (create / subpage / archive / delete)
- Block editor: headings, lists, to-dos, quote, code, divider, with a `/` slash
  menu and markdown input shortcuts
- `[[wikilinks]]` with autocomplete; clicking a link opens or creates the page
- **Backlinks** ("Linked references") panel on every page
- Markdown **import** and **export** per page
- Full-text-ish search over titles and content
- Autosave to the database on every edit (= cloud sync)

## Getting started

```bash
npm install
cp .env.example .env        # adjust AUTH_SECRET
npm run db:push             # create the SQLite schema
npm run db:seed             # optional: demo account → demo@z.app / password123
npm run dev                 # http://localhost:3000
```

Sign up at `/signup`, or sign in with the seeded demo account.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:seed` | Seed a demo workspace |
| `npm run db:reset` | Reset DB and reseed |

## Roadmap

- **Phase 2** — Cmd-K command palette, tags, Notion-style databases (table /
  board / gallery)
- **Phase 3** — Obsidian-style graph view of wikilinks
- **Phase 4** — hosted Postgres + realtime collaborative editing (Yjs)
- **Phase 5** — Tauri desktop app with an optional local `.md` vault
