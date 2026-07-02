import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Blocks,
  Link2,
  Share2,
  Table2,
  Users,
  FileDown,
} from "lucide-react";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="font-display flex h-7 w-7 items-center justify-center rounded bg-accent text-sm font-extrabold text-white">
            Z
          </div>
          <span className="font-display text-lg font-bold">Z</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-muted hover:text-text"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-8 pt-16 text-center sm:pt-24">
        <div className="mb-4 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Notion × Obsidian, in one place
        </div>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Your notes, connected.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          A block editor like Notion, wikilinks and a knowledge graph like
          Obsidian, structured databases, and live collaboration — synced to the
          cloud.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:opacity-90"
          >
            Start writing — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-surface"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
        <Feature
          icon={<Blocks size={20} />}
          title="Block editor"
          desc="Headings, lists, to-dos, code, quotes and a slash menu — with Markdown shortcuts as you type."
        />
        <Feature
          icon={<Link2 size={20} />}
          title="Wikilinks & backlinks"
          desc="Type [[ to link any page. Every reference shows up as a backlink automatically."
        />
        <Feature
          icon={<Share2 size={20} />}
          title="Knowledge graph"
          desc="See how your notes connect in an interactive force-directed graph."
        />
        <Feature
          icon={<Table2 size={20} />}
          title="Databases"
          desc="Table, board and gallery views with properties, filters and sorts."
        />
        <Feature
          icon={<Users size={20} />}
          title="Live collaboration"
          desc="Edit together in real time with shared cursors and presence."
        />
        <Feature
          icon={<FileDown size={20} />}
          title="Own your data"
          desc="Import and export Markdown, or download your whole workspace as a vault."
        />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-2xl bg-accent px-8 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Start your second brain today.
          </h2>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-accent hover:opacity-90"
          >
            Create your workspace
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        Z — a Notion + Obsidian notes app.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="font-display mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-muted">{desc}</p>
    </div>
  );
}
