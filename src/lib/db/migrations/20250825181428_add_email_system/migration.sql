/*
  Warnings:

  - The `codeSendStatus` column on the `Voter` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CodeSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL', 'INVALID', 'BLOCKED');

-- AlterTable
ALTER TABLE "Party" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Voter" DROP COLUMN "codeSendStatus",
ADD COLUMN     "codeSendStatus" "CodeSendStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "templateId" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "subject" TEXT NOT NULL,
    "htmlSize" INTEGER,
    "textSize" INTEGER,
    "attachments" INTEGER DEFAULT 0,
    "provider" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "tags" JSONB,
    "campaign" TEXT,
    "organizationId" INTEGER,
    "electionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source" TEXT,
    "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "bounceType" TEXT,
    "complaintType" TEXT,
    "metadata" JSONB,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_toEmail_createdAt_idx" ON "email_logs"("toEmail", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_provider_status_createdAt_idx" ON "email_logs"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_templateId_createdAt_idx" ON "email_logs"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_organizationId_createdAt_idx" ON "email_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_electionId_createdAt_idx" ON "email_logs"("electionId", "createdAt");

-- CreateIndex
CREATE INDEX "email_logs_status_queuedAt_idx" ON "email_logs"("status", "queuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_email_idx" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_reason_suppressedAt_idx" ON "email_suppressions"("reason", "suppressedAt");

-- CreateIndex
CREATE INDEX "email_suppressions_organizationId_email_idx" ON "email_suppressions"("organizationId", "email");

-- CreateIndex
CREATE INDEX "email_suppressions_expiresAt_idx" ON "email_suppressions"("expiresAt");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
