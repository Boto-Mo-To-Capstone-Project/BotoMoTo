/*
  Warnings:

  - You are about to drop the `api_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_suppressions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_electionId_fkey";

-- DropForeignKey
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "email_suppressions" DROP CONSTRAINT "email_suppressions_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "email_templates" DROP CONSTRAINT "email_templates_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_userId_fkey";

-- DropTable
DROP TABLE "api_logs";

-- DropTable
DROP TABLE "email_logs";

-- DropTable
DROP TABLE "email_suppressions";

-- DropTable
DROP TABLE "email_templates";

-- DropTable
DROP TABLE "system_metrics";

-- DropTable
DROP TABLE "user_sessions";

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL DEFAULT 'CUSTOM',
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "defaultSubject" TEXT,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
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

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
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

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_endpoint_createdAt_idx" ON "ApiLog"("endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_statusCode_createdAt_idx" ON "ApiLog"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "UserSession_startedAt_endedAt_idx" ON "UserSession"("startedAt", "endedAt");

-- CreateIndex
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SystemMetric_metricType_recordedAt_idx" ON "SystemMetric"("metricType", "recordedAt");

-- CreateIndex
CREATE INDEX "EmailTemplate_organizationId_type_idx" ON "EmailTemplate"("organizationId", "type");

-- CreateIndex
CREATE INDEX "EmailTemplate_templateId_idx" ON "EmailTemplate"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_organizationId_templateId_key" ON "EmailTemplate"("organizationId", "templateId");

-- CreateIndex
CREATE INDEX "EmailLog_toEmail_createdAt_idx" ON "EmailLog"("toEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_provider_status_createdAt_idx" ON "EmailLog"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_templateId_createdAt_idx" ON "EmailLog"("templateId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_organizationId_createdAt_idx" ON "EmailLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_electionId_createdAt_idx" ON "EmailLog"("electionId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_status_queuedAt_idx" ON "EmailLog"("status", "queuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "EmailSuppression_email_idx" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "EmailSuppression_reason_suppressedAt_idx" ON "EmailSuppression"("reason", "suppressedAt");

-- CreateIndex
CREATE INDEX "EmailSuppression_organizationId_email_idx" ON "EmailSuppression"("organizationId", "email");

-- CreateIndex
CREATE INDEX "EmailSuppression_expiresAt_idx" ON "EmailSuppression"("expiresAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
