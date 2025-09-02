/*
  Warnings:

  - Added the required column `chainOrder` to the `VoteResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prevHash` to the `VoteResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `VoteResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."VoteResponse" ADD COLUMN     "chainOrder" INTEGER NOT NULL,
ADD COLUMN     "prevHash" TEXT NOT NULL,
ADD COLUMN     "signature" TEXT NOT NULL;
