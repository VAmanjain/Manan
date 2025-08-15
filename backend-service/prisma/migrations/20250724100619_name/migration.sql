/*
  Warnings:

  - The `content` column on the `blocks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlockType" ADD VALUE 'BULLETED_LIST';
ALTER TYPE "BlockType" ADD VALUE 'NUMBERED_LIST';
ALTER TYPE "BlockType" ADD VALUE 'CALL_OUT';

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "properties" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB;

-- CreateIndex
CREATE INDEX "blocks_parentId_idx" ON "blocks"("parentId");

-- CreateIndex
CREATE INDEX "blocks_type_idx" ON "blocks"("type");

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
