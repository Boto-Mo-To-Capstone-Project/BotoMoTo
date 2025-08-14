/*
  Warnings:

  - You are about to drop the column `type` on the `VotingScope` table. All the data in the column will be lost.
*/

-- RedefineTables to drop column `type` from `VotingScope`
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_VotingScope" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "VotingScope_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_VotingScope" ("id","electionId","name","description","createdAt","updatedAt","deletedAt","isDeleted")
SELECT "id","electionId","name","description","createdAt","updatedAt","deletedAt","isDeleted" FROM "VotingScope";

DROP TABLE "VotingScope";
ALTER TABLE "new_VotingScope" RENAME TO "VotingScope";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
