/*
  Warnings:

  - You are about to drop the column `mfaMethod` on the `MfaSettings` table. All the data in the column will be lost.
  - You are about to drop the column `totpSecret` on the `MfaSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."MfaSettings" DROP COLUMN "mfaMethod",
DROP COLUMN "totpSecret",
ADD COLUMN     "mfaMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "public"."MfaMethod";

-- CreateTable
CREATE TABLE "public"."MfaSession" (
    "id" TEXT NOT NULL,
    "electionId" INTEGER NOT NULL,
    "voterEmail" TEXT NOT NULL,
    "voterCode" TEXT NOT NULL,
    "requiredMethods" TEXT[],
    "completedMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MfaSession_sessionToken_key" ON "public"."MfaSession"("sessionToken");

-- CreateIndex
CREATE INDEX "MfaSession_sessionToken_idx" ON "public"."MfaSession"("sessionToken");

-- CreateIndex
CREATE INDEX "MfaSession_electionId_voterEmail_idx" ON "public"."MfaSession"("electionId", "voterEmail");

-- CreateIndex
CREATE INDEX "MfaSession_expiresAt_idx" ON "public"."MfaSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MfaSession_electionId_voterEmail_key" ON "public"."MfaSession"("electionId", "voterEmail");

-- AddForeignKey
ALTER TABLE "public"."MfaSession" ADD CONSTRAINT "MfaSession_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
