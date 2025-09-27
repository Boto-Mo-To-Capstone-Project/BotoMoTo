-- CreateTable
CREATE TABLE "public"."VoterSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "voterId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoterSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoterSession_sessionToken_key" ON "public"."VoterSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VoterSession_sessionToken_idx" ON "public"."VoterSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VoterSession_voterId_isActive_idx" ON "public"."VoterSession"("voterId", "isActive");

-- AddForeignKey
ALTER TABLE "public"."VoterSession" ADD CONSTRAINT "VoterSession_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
