/*
  Warnings:

  - You are about to drop the `AuditTableAffected` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Broadcast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailSuppression` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AuditTableAffected" DROP CONSTRAINT "AuditTableAffected_auditId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Broadcast" DROP CONSTRAINT "Broadcast_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailLog" DROP CONSTRAINT "EmailLog_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailLog" DROP CONSTRAINT "EmailLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EmailSuppression" DROP CONSTRAINT "EmailSuppression_organizationId_fkey";

-- DropTable
DROP TABLE "public"."AuditTableAffected";

-- DropTable
DROP TABLE "public"."Broadcast";

-- DropTable
DROP TABLE "public"."EmailLog";

-- DropTable
DROP TABLE "public"."EmailSuppression";
