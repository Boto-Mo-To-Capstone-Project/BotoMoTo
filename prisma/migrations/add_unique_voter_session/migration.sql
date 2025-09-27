-- Add unique constraint to prevent multiple active sessions per voter
-- This ensures database-level protection against concurrent logins

-- First, clean up any existing duplicate active sessions
UPDATE "VoterSession" SET "isActive" = false 
WHERE "id" NOT IN (
  SELECT MIN("id") 
  FROM "VoterSession" 
  WHERE "isActive" = true 
  GROUP BY "voterId"
);

-- Add unique partial index for active sessions only
-- This prevents multiple active sessions for the same voter at database level
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "VoterSession_voterId_active_unique" 
ON "VoterSession" ("voterId") 
WHERE "isActive" = true;

-- Add comment to document the constraint
COMMENT ON INDEX "VoterSession_voterId_active_unique" IS 'Ensures only one active session per voter to prevent concurrent logins';
