/*
  Warnings:

  - You are about to drop the column `allowSurvey` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `Voter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Election" DROP COLUMN "allowSurvey";

-- AlterTable
ALTER TABLE "public"."Voter" DROP COLUMN "isVerified";
