-- Add unique partial index to prevent multiple active sessions per voter
-- This provides database-level enforcement in addition to application-level locking

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS "VoterSession_voterId_active_unique";
DROP INDEX IF EXISTS "voter_session_active_unique";

-- Create unique partial index for active sessions per voter
-- This ensures only one active, non-expired session per voter at the database level
-- Note: We can't use NOW() in index predicate, so we'll rely on application-level expiry checking
CREATE UNIQUE INDEX "voter_session_active_unique" 
ON "VoterSession" ("voterId") 
WHERE "isActive" = true;

-- Optional: Add a comment to document the constraint
COMMENT ON INDEX "voter_session_active_unique" IS 'Ensures only one active session per voter to prevent concurrent logins';
