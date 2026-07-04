// Seeds a demo account so the app is usable immediately after `npm run db:reset`.
// Self-contained (no "@/" alias or server-only imports) so it runs under tsx.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultPages } from "../src/lib/default-content";
import { pmToMarkdown } from "../src/lib/markdown";
import {
  extractWikiLinks,
  parseContent,
  normalizeTitle,
} from "../src/lib/wikilinks";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@z.app";
const DEMO_PASSWORD = "password123";

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo Workspace",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  const pages = defaultPages();
  const keyToId = new Map<string, string>();
  const parentByKey: Record<string, string | null> = {
    welcome: null,
    "getting-started": "welcome",
    ideas: "welcome",
  };
  const orderByKey: Record<string, number> = {
    welcome: 0,
    "getting-started": 0,
    ideas: 1,
  };

  for (const key of ["welcome", "getting-started", "ideas"]) {
    const seed = pages.find((p) => p.key === key)!;
    const parentKey = parentByKey[key];
    const created = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        parentId: parentKey ? keyToId.get(parentKey)! : null,
        title: seed.title,
        icon: seed.icon,
        content: JSON.stringify(seed.doc),
        markdown: pmToMarkdown(seed.doc),
        order: orderByKey[key],
      },
    });
    keyToId.set(key, created.id);
  }

  // Resolve wikilinks into Link rows for backlinks.
  const all = await prisma.page.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, title: true, content: true },
  });
  const byTitle = new Map(all.map((p) => [normalizeTitle(p.title), p.id]));

  for (const p of all) {
    const labels = extractWikiLinks(parseContent(p.content));
    for (const label of labels) {
      const targetId = byTitle.get(normalizeTitle(label));
      if (targetId && targetId !== p.id) {
        await prisma.link.upsert({
          where: {
            sourcePageId_targetPageId: {
              sourcePageId: p.id,
              targetPageId: targetId,
            },
          },
          create: {
            workspaceId: workspace.id,
            sourcePageId: p.id,
            targetPageId: targetId,
          },
          update: {},
        });
      }
    }
  }

  // Sample Notion-style database page.
  const optId = () => `opt_${Math.random().toString(36).slice(2, 10)}`;
  const status = [
    { id: optId(), name: "Todo", color: "gray" },
    { id: optId(), name: "In Progress", color: "blue" },
    { id: optId(), name: "Done", color: "green" },
  ];
  const dbPage = await prisma.page.create({
    data: {
      workspaceId: workspace.id,
      type: "database",
      title: "Project Tracker",
      icon: "🗂️",
      order: 1,
    },
  });
  const database = await prisma.database.create({
    data: {
      workspaceId: workspace.id,
      pageId: dbPage.id,
      properties: {
        create: [
          { name: "Name", type: "text", order: 0 },
          { name: "Status", type: "select", options: JSON.stringify(status), order: 1 },
          { name: "Due", type: "date", order: 2 },
          { name: "Done", type: "checkbox", order: 3 },
        ],
      },
      views: {
        create: [
          { name: "Table", type: "table", order: 0 },
          { name: "Board", type: "board", order: 1 },
        ],
      },
    },
    include: { properties: true },
  });
  const nameP = database.properties.find((p) => p.name === "Name")!;
  const statusP = database.properties.find((p) => p.name === "Status")!;
  const dueP = database.properties.find((p) => p.name === "Due")!;
  const doneP = database.properties.find((p) => p.name === "Done")!;
  const samples = [
    { name: "Design landing page", status: 1, due: "2026-07-10", done: false },
    { name: "Set up CI", status: 2, due: "2026-07-02", done: true },
    { name: "Write docs", status: 0, due: "2026-07-20", done: false },
    { name: "Launch beta", status: 0, due: "2026-08-01", done: false },
  ];
  await prisma.databaseRow.createMany({
    data: samples.map((s, i) => ({
      databaseId: database.id,
      order: i,
      cells: JSON.stringify({
        [nameP.id]: s.name,
        [statusP.id]: status[s.status].id,
        [dueP.id]: s.due,
        [doneP.id]: s.done,
      }),
    })),
  });

  console.log(`Seeded demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
