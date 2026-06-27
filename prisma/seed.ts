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
    data: { name: "Demo Workspace", ownerId: user.id },
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

  console.log(`Seeded demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
