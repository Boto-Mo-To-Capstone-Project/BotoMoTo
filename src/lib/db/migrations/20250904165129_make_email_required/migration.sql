/*
  Warnings:

  - Made the column `email` on table `Voter` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Voter" ALTER COLUMN "email" SET NOT NULL;
