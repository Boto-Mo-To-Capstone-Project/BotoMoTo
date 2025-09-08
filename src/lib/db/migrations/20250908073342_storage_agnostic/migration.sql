/*
  Warnings:

  - You are about to drop the column `credentialUrl` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Candidate` table. All the data in the column will be lost.
  - You are about to drop the column `letterMetadata` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `letterUrl` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `logoMetadata` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Candidate" DROP COLUMN "credentialUrl",
DROP COLUMN "imageUrl",
ADD COLUMN     "credentialObjectKey" TEXT,
ADD COLUMN     "credentialProvider" TEXT,
ADD COLUMN     "imageObjectKey" TEXT,
ADD COLUMN     "imageProvider" TEXT;

-- AlterTable
ALTER TABLE "public"."Organization" DROP COLUMN "letterMetadata",
DROP COLUMN "letterUrl",
DROP COLUMN "logoMetadata",
DROP COLUMN "photoUrl";
