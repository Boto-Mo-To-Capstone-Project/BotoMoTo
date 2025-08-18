/*
  Warnings:

  - You are about to drop the column `description` on the `Position` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "voteLimit" INTEGER NOT NULL DEFAULT 1,
    "numOfWinners" INTEGER NOT NULL DEFAULT 1,
    "votingScopeId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Position_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Position_votingScopeId_fkey" FOREIGN KEY ("votingScopeId") REFERENCES "VotingScope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Position" ("createdAt", "deletedAt", "electionId", "id", "isDeleted", "name", "numOfWinners", "order", "updatedAt", "voteLimit", "votingScopeId") SELECT "createdAt", "deletedAt", "electionId", "id", "isDeleted", "name", "numOfWinners", "order", "updatedAt", "voteLimit", "votingScopeId" FROM "Position";
DROP TABLE "Position";
ALTER TABLE "new_Position" RENAME TO "Position";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
