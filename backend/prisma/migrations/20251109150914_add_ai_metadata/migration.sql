-- AlterTable
ALTER TABLE "File" ADD COLUMN "embedding" BLOB;
ALTER TABLE "File" ADD COLUMN "summary" TEXT;
ALTER TABLE "File" ADD COLUMN "tags" TEXT;
