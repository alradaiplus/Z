-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'doc',
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "icon" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "markdown" TEXT NOT NULL DEFAULT '',
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Database" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseProperty" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" TEXT NOT NULL DEFAULT '[]',
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DatabaseProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseRow" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cells" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatabaseRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseView" (
    "id" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Table',
    "type" TEXT NOT NULL DEFAULT 'table',
    "config" TEXT NOT NULL DEFAULT '{}',
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DatabaseView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageTag" (
    "pageId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PageTag_pkey" PRIMARY KEY ("pageId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Page_workspaceId_idx" ON "Page"("workspaceId");

-- CreateIndex
CREATE INDEX "Page_parentId_idx" ON "Page"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Database_pageId_key" ON "Database"("pageId");

-- CreateIndex
CREATE INDEX "Database_workspaceId_idx" ON "Database"("workspaceId");

-- CreateIndex
CREATE INDEX "DatabaseProperty_databaseId_idx" ON "DatabaseProperty"("databaseId");

-- CreateIndex
CREATE INDEX "DatabaseRow_databaseId_idx" ON "DatabaseRow"("databaseId");

-- CreateIndex
CREATE INDEX "DatabaseView_databaseId_idx" ON "DatabaseView"("databaseId");

-- CreateIndex
CREATE INDEX "Link_workspaceId_idx" ON "Link"("workspaceId");

-- CreateIndex
CREATE INDEX "Link_targetPageId_idx" ON "Link"("targetPageId");

-- CreateIndex
CREATE UNIQUE INDEX "Link_sourcePageId_targetPageId_key" ON "Link"("sourcePageId", "targetPageId");

-- CreateIndex
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "PageTag_tagId_idx" ON "PageTag"("tagId");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseProperty" ADD CONSTRAINT "DatabaseProperty_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseRow" ADD CONSTRAINT "DatabaseRow_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatabaseView" ADD CONSTRAINT "DatabaseView_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageTag" ADD CONSTRAINT "PageTag_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageTag" ADD CONSTRAINT "PageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

