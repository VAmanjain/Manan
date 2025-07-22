-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('REFERENCE', 'BACKLINK', 'EMBED', 'ALIAS');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('HEADING', 'TEXT', 'TODO', 'CHECKLIST', 'SUMMARY', 'IMAGE', 'CODE', 'QUOTE', 'DIVIDER', 'TABLE', 'EMBED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "icon" TEXT,
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_links" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "linkText" TEXT,
    "linkType" "LinkType" NOT NULL DEFAULT 'REFERENCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "page_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "pages_workspaceId_parentId_idx" ON "pages"("workspaceId", "parentId");

-- CreateIndex
CREATE INDEX "pages_createdById_idx" ON "pages"("createdById");

-- CreateIndex
CREATE INDEX "pages_isPublished_isArchived_idx" ON "pages"("isPublished", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "pages_workspaceId_slug_key" ON "pages"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "page_links_sourceId_idx" ON "page_links"("sourceId");

-- CreateIndex
CREATE INDEX "page_links_targetId_idx" ON "page_links"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "page_links_sourceId_targetId_key" ON "page_links"("sourceId", "targetId");

-- CreateIndex
CREATE INDEX "blocks_pageId_position_idx" ON "blocks"("pageId", "position");

-- CreateIndex
CREATE INDEX "focus_sessions_userId_startTime_idx" ON "focus_sessions"("userId", "startTime");

-- CreateIndex
CREATE INDEX "focus_sessions_pageId_idx" ON "focus_sessions"("pageId");

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
