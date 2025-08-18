/*
  Warnings:

  - You are about to drop the `CandidateEducationLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateLeadershipExperience` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandidateWorkExperience` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `bio` on the `Candidate` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CandidateEducationLevel";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CandidateLeadershipExperience";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CandidateWorkExperience";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "voterId" INTEGER NOT NULL,
    "positionId" INTEGER NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "partyId" INTEGER,
    "imageUrl" TEXT,
    "credentialUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Candidate_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Candidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Candidate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Candidate" ("createdAt", "deletedAt", "electionId", "id", "imageUrl", "isDeleted", "isNew", "partyId", "positionId", "updatedAt", "voterId") SELECT "createdAt", "deletedAt", "electionId", "id", "imageUrl", "isDeleted", "isNew", "partyId", "positionId", "updatedAt", "voterId" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
CREATE UNIQUE INDEX "Candidate_voterId_key" ON "Candidate"("voterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
