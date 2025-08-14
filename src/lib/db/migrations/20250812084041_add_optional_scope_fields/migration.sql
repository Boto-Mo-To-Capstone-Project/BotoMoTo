/*
  Warnings:

  - A unique constraint covering the columns `[electionId,name]` on the table `Party` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Election" ADD COLUMN "scopeType" TEXT;
ALTER TABLE "Election" ADD COLUMN "scopeTypeLabel" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VotingScope" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "type" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "VotingScope_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VotingScope" ("createdAt", "deletedAt", "description", "electionId", "id", "isDeleted", "name", "type", "updatedAt") SELECT "createdAt", "deletedAt", "description", "electionId", "id", "isDeleted", "name", "type", "updatedAt" FROM "VotingScope";
DROP TABLE "VotingScope";
ALTER TABLE "new_VotingScope" RENAME TO "VotingScope";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Party_electionId_name_key" ON "Party"("electionId", "name");
