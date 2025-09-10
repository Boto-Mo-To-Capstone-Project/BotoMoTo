-- AlterTable
ALTER TABLE "public"."Election" ADD COLUMN     "instanceName" TEXT,
ADD COLUMN     "instanceYear" INTEGER,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Election" ADD CONSTRAINT "Election_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;
