/*
  Warnings:

  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChiefAdministrator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `ipAdress` on the `Audits` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `ipAddress` to the `Audits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `electionId` to the `Broadcast` table without a default value. This is not possible if the table is not empty.
  - Added the required column `electionId` to the `SurveyForm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `Ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voteHash` to the `VoteResponse` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Admin_email_key";

-- DropIndex
DROP INDEX "ChiefAdministrator_email_key";

-- AlterTable
ALTER TABLE "CandidateEducationLevel" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "CandidateLeadershipExperience" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "CandidateWorkExperience" ADD COLUMN "description" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Admin";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ChiefAdministrator";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditTableAffected" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "auditId" INTEGER NOT NULL,
    "tableAffected" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    CONSTRAINT "AuditTableAffected_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuditTableAffected" ("auditId", "changes", "id", "recordId", "tableAffected") SELECT "auditId", "changes", "id", "recordId", "tableAffected" FROM "AuditTableAffected";
DROP TABLE "AuditTableAffected";
ALTER TABLE "new_AuditTableAffected" RENAME TO "AuditTableAffected";
CREATE TABLE "new_Audits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Audits" ("action", "actorId", "actorRole", "id", "timestamp", "userAgent") SELECT "action", "actorId", "actorRole", "id", "timestamp", "userAgent" FROM "Audits";
DROP TABLE "Audits";
ALTER TABLE "new_Audits" RENAME TO "Audits";
CREATE TABLE "new_Broadcast" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Broadcast_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Broadcast" ("createdAt", "id", "isSent", "message", "scheduledAt", "sentAt", "title", "updatedAt") SELECT "createdAt", "id", "isSent", "message", "scheduledAt", "sentAt", "title", "updatedAt" FROM "Broadcast";
DROP TABLE "Broadcast";
ALTER TABLE "new_Broadcast" RENAME TO "Broadcast";
CREATE TABLE "new_Candidate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "voterId" INTEGER NOT NULL,
    "positionId" INTEGER NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "partyId" INTEGER,
    "imageUrl" TEXT,
    "bio" TEXT,
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
INSERT INTO "new_Election" ("createdAt", "deletedAt", "description", "id", "isDeleted", "name", "orgId", "status", "updatedAt") SELECT "createdAt", "deletedAt", "description", "id", "isDeleted", "name", "orgId", "status", "updatedAt" FROM "Election";
DROP TABLE "Election";
ALTER TABLE "new_Election" RENAME TO "Election";
CREATE TABLE "new_MfaSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "totpSecret" TEXT,
    CONSTRAINT "MfaSettings_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MfaSettings" ("electionId", "id", "mfaEnabled", "mfaMethod") SELECT "electionId", "id", "mfaEnabled", "mfaMethod" FROM "MfaSettings";
DROP TABLE "MfaSettings";
ALTER TABLE "new_MfaSettings" RENAME TO "MfaSettings";
CREATE UNIQUE INDEX "MfaSettings_electionId_key" ON "MfaSettings"("electionId");
CREATE TABLE "new_Organization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "membersCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "photoUrl" TEXT,
    "letterUrl" TEXT,
    "frequency" TEXT,
    "theme" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Organization_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Organization" ("adminId", "createdAt", "deletedAt", "description", "frequency", "id", "isDeleted", "letterUrl", "membersCount", "name", "photoUrl", "status", "updatedAt") SELECT "adminId", "createdAt", "deletedAt", "description", "frequency", "id", "isDeleted", "letterUrl", "membersCount", "name", "photoUrl", "status", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_adminId_key" ON "Organization"("adminId");
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Party_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Party" ("color", "createdAt", "deletedAt", "electionId", "id", "isDeleted", "logoUrl", "name", "updatedAt") SELECT "color", "createdAt", "deletedAt", "electionId", "id", "isDeleted", "logoUrl", "name", "updatedAt" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE TABLE "new_Position" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
INSERT INTO "new_Position" ("createdAt", "deletedAt", "description", "electionId", "id", "isDeleted", "name", "numOfWinners", "updatedAt", "voteLimit", "votingScopeId") SELECT "createdAt", "deletedAt", "description", "electionId", "id", "isDeleted", "name", "numOfWinners", "updatedAt", "voteLimit", "votingScopeId" FROM "Position";
DROP TABLE "Position";
ALTER TABLE "new_Position" RENAME TO "Position";
CREATE TABLE "new_SurveyForm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formSchema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SurveyForm_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SurveyForm" ("createdAt", "deletedAt", "description", "formSchema", "id", "isDeleted", "title", "updatedAt") SELECT "createdAt", "deletedAt", "description", "formSchema", "id", "isDeleted", "title", "updatedAt" FROM "SurveyForm";
DROP TABLE "SurveyForm";
ALTER TABLE "new_SurveyForm" RENAME TO "SurveyForm";
CREATE UNIQUE INDEX "SurveyForm_electionId_key" ON "SurveyForm"("electionId");
CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orgId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "Ticket_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("closedAt", "createdAt", "id", "message", "status", "subject", "updatedAt") SELECT "closedAt", "createdAt", "id", "message", "status", "subject", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "emailVerified" DATETIME,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "password", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "password", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_VoteResponse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "electionId" INTEGER NOT NULL,
    "voterId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "positionId" INTEGER NOT NULL,
    "voteHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoteResponse_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VoteResponse_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VoteResponse_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VoteResponse_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VoteResponse" ("candidateId", "electionId", "id", "positionId", "voterId") SELECT "candidateId", "electionId", "id", "positionId", "voterId" FROM "VoteResponse";
DROP TABLE "VoteResponse";
ALTER TABLE "new_VoteResponse" RENAME TO "VoteResponse";
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
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "votedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Voter_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Voter_votingScopeId_fkey" FOREIGN KEY ("votingScopeId") REFERENCES "VotingScope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Voter" ("address", "code", "codeSendStatus", "contactNum", "createdAt", "deletedAt", "electionId", "email", "firstName", "hasVoted", "id", "isActive", "isDeleted", "isVerified", "lastName", "middleName", "updatedAt", "votingScopeId") SELECT "address", "code", "codeSendStatus", "contactNum", "createdAt", "deletedAt", "electionId", "email", "firstName", "hasVoted", "id", "isActive", "isDeleted", "isVerified", "lastName", "middleName", "updatedAt", "votingScopeId" FROM "Voter";
DROP TABLE "Voter";
ALTER TABLE "new_Voter" RENAME TO "Voter";
CREATE UNIQUE INDEX "Voter_code_key" ON "Voter"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
