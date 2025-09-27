/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `VoterSession` table. All the data in the column will be lost.
  - Added the required column `expires` to the `VoterSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."VoterSession" DROP CONSTRAINT "VoterSession_voterId_fkey";

-- AlterTable
ALTER TABLE "public"."VoterSession" DROP COLUMN "expiresAt",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."VoterSession" ADD CONSTRAINT "VoterSession_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."Voter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
