/*
  Warnings:

  - You are about to drop the column `address` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `hasVoted` on the `Voter` table. All the data in the column will be lost.
  - You are about to drop the column `votedAt` on the `Voter` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Voter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "contactNum" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "codeSendStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "votingScopeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Voter_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Voter_votingScopeId_fkey" FOREIGN KEY ("votingScopeId") REFERENCES "VotingScope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Voter" ("code", "codeSendStatus", "contactNum", "createdAt", "deletedAt", "electionId", "email", "firstName", "id", "isActive", "isDeleted", "isVerified", "lastName", "middleName", "updatedAt", "votingScopeId") SELECT "code", "codeSendStatus", "contactNum", "createdAt", "deletedAt", "electionId", "email", "firstName", "id", "isActive", "isDeleted", "isVerified", "lastName", "middleName", "updatedAt", "votingScopeId" FROM "Voter";
DROP TABLE "Voter";
ALTER TABLE "new_Voter" RENAME TO "Voter";
CREATE UNIQUE INDEX "Voter_code_key" ON "Voter"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "VoteResponse_electionId_voterId_idx" ON "VoteResponse"("electionId", "voterId");

-- CreateIndex
CREATE INDEX "VoteResponse_electionId_timestamp_idx" ON "VoteResponse"("electionId", "timestamp");
