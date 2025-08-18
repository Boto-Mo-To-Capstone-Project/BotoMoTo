/*
  Warnings:

  - You are about to drop the column `scopeType` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `scopeTypeLabel` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Party` table. All the data in the column will be lost.
  - You are about to drop the column `logoUrl` on the `Party` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Election" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "allowSurvey" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Election_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Election" ("allowSurvey", "createdAt", "deletedAt", "description", "id", "isDeleted", "isLive", "name", "orgId", "status", "updatedAt") SELECT "allowSurvey", "createdAt", "deletedAt", "description", "id", "isDeleted", "isLive", "name", "orgId", "status", "updatedAt" FROM "Election";
DROP TABLE "Election";
ALTER TABLE "new_Election" RENAME TO "Election";
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Party_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Party" ("color", "createdAt", "deletedAt", "electionId", "id", "isDeleted", "name", "updatedAt") SELECT "color", "createdAt", "deletedAt", "electionId", "id", "isDeleted", "name", "updatedAt" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE UNIQUE INDEX "Party_electionId_name_key" ON "Party"("electionId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
