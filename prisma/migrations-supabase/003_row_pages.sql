-- Incremental migration: database rows can open as detail pages.
ALTER TABLE "DatabaseRow" ADD COLUMN "pageId" TEXT;
CREATE UNIQUE INDEX "DatabaseRow_pageId_key" ON "DatabaseRow"("pageId");
ALTER TABLE "DatabaseRow"
  ADD CONSTRAINT "DatabaseRow_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
