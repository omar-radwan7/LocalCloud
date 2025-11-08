-- AlterTable
ALTER TABLE "File" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "File_contentHash_idx" ON "File"("contentHash");
