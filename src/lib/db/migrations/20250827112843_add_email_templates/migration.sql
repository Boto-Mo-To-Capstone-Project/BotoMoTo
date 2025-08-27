-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL DEFAULT 'CUSTOM',
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "defaultSubject" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "filePath" TEXT,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_templates_organizationId_type_idx" ON "email_templates"("organizationId", "type");

-- CreateIndex
CREATE INDEX "email_templates_templateId_idx" ON "email_templates"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_organizationId_templateId_key" ON "email_templates"("organizationId", "templateId");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
