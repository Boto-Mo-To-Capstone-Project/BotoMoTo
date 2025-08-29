-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "letterMetadata" JSONB,
ADD COLUMN     "letterObjectKey" TEXT,
ADD COLUMN     "letterProvider" TEXT,
ADD COLUMN     "logoMetadata" JSONB,
ADD COLUMN     "logoObjectKey" TEXT,
ADD COLUMN     "logoProvider" TEXT;
