/*
  Warnings:

  - Added the required column `updatedAt` to the `VotingScope` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VotingScope" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "VotingScope_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VotingScope" ("description", "electionId", "id", "name", "type") SELECT "description", "electionId", "id", "name", "type" FROM "VotingScope";
DROP TABLE "VotingScope";
ALTER TABLE "new_VotingScope" RENAME TO "VotingScope";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
