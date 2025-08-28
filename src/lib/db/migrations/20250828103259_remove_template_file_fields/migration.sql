/*
  Warnings:

  - You are about to drop the column `fileName` on the `email_templates` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `email_templates` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `email_templates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "email_templates" DROP COLUMN "fileName",
DROP COLUMN "filePath",
DROP COLUMN "fileSize";
