-- Delete existing test students first
DELETE FROM "Student";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "browserId" TEXT NOT NULL DEFAULT '';
