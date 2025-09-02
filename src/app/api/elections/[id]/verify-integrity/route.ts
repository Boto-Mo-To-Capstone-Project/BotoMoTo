import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import crypto from "crypto";

// HMAC secret key from environment variables
const VOTE_SECRET = process.env.VOTE_SECRET;

// Verify the integrity of a vote chain for an election
async function verifyVoteChain(electionId: number): Promise<{
  isValid: boolean;
  totalVotes: number;
  verifiedVotes: number;
  errors: Array<{
    voteId: number;
    chainOrder: number;
    issues: string[];
  }>;
  chainSummary: {
    startHash: string;
    endHash: string;
    firstVoteAt: Date | null;
    lastVoteAt: Date | null;
  };
}> {
  if (!VOTE_SECRET) {
    throw new Error("Vote verification service is not properly configured");
  }

  const votes = await db.voteResponse.findMany({
    where: { electionId },
    orderBy: { chainOrder: 'asc' },
    select: {
      id: true,
      voterId: true,
      candidateId: true,
      positionId: true,
      voteHash: true,
      prevHash: true,
      chainOrder: true,
      signature: true,
      timestamp: true
    }
  });

  const result = {
    isValid: true,
    totalVotes: votes.length,
    verifiedVotes: 0,
    errors: [] as Array<{
      voteId: number;
      chainOrder: number;
      issues: string[];
    }>,
    chainSummary: {
      startHash: '0',
      endHash: '0',
      firstVoteAt: null as Date | null,
      lastVoteAt: null as Date | null
    }
  };

  if (votes.length === 0) {
    return result;
  }

  let expectedPrevHash = '0'; // Genesis hash
  result.chainSummary.firstVoteAt = votes[0].timestamp;
  result.chainSummary.lastVoteAt = votes[votes.length - 1].timestamp;

  for (const vote of votes) {
    const issues: string[] = [];

    // Reconstruct the vote data and chain data
    const voteData = `${vote.voterId}-${vote.candidateId}-${vote.positionId}-${vote.timestamp.getTime()}-${vote.chainOrder}`;
    const chainData = `${voteData}-${expectedPrevHash}`;

    // Verify hash
    const expectedHash = crypto.createHash('sha256').update(chainData).digest('hex');
    if (vote.voteHash !== expectedHash) {
      issues.push(`Hash mismatch: expected ${expectedHash}, got ${vote.voteHash}`);
    }

    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', VOTE_SECRET)
      .update(chainData)
      .digest('hex');
    if (vote.signature !== expectedSignature) {
      issues.push("Invalid HMAC signature");
    }

    // Verify prevHash matches expected
    if (vote.prevHash !== expectedPrevHash) {
      issues.push(`Previous hash mismatch: expected ${expectedPrevHash}, got ${vote.prevHash}`);
    }

    // Check chain order continuity
    const expectedChainOrder = votes.indexOf(vote) + 1;
    if (vote.chainOrder !== expectedChainOrder) {
      issues.push(`Chain order mismatch: expected ${expectedChainOrder}, got ${vote.chainOrder}`);
    }

    if (issues.length > 0) {
      result.errors.push({
        voteId: vote.id,
        chainOrder: vote.chainOrder,
        issues
      });
      result.isValid = false;
    } else {
      result.verifiedVotes++;
    }

    expectedPrevHash = vote.voteHash;
  }

  result.chainSummary.endHash = expectedPrevHash;
  return result;
}

// Handle GET request to verify election integrity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    if (!VOTE_SECRET) {
      return apiResponse({
        success: false,
        message: "Vote verification service is not properly configured",
        data: null,
        error: "Server Misconfiguration",
        status: 500
      });
    }

    const { id } = await params;
    const electionId = parseInt(id);
    
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Verify election exists and get basic info
    const election = await db.election.findUnique({
      where: { 
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            adminId: true
          }
        },
        _count: {
          select: {
            voteResponses: true,
            voters: true,
            candidates: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Admin can only verify their own elections, superadmin can verify any election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only verify elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Perform chain verification
    const verificationResult = await verifyVoteChain(electionId);

    // Calculate additional statistics
    const integrityPercentage = verificationResult.totalVotes > 0 
      ? Math.round((verificationResult.verifiedVotes / verificationResult.totalVotes) * 100)
      : 100;

    const response = {
      election: {
        id: election.id,
        name: election.name,
        status: election.status,
        organization: election.organization.name
      },
      verification: {
        timestamp: new Date().toISOString(),
        isValid: verificationResult.isValid,
        integrityPercentage,
        summary: {
          totalVotes: verificationResult.totalVotes,
          verifiedVotes: verificationResult.verifiedVotes,
          invalidVotes: verificationResult.errors.length,
          totalVoters: election._count.voters,
          totalCandidates: election._count.candidates
        },
        chain: verificationResult.chainSummary,
        errors: verificationResult.errors.length > 0 ? verificationResult.errors : undefined
      }
    };

    // Create audit log for verification action
    await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      message: `Election integrity verification - ${verificationResult.isValid ? 'PASSED' : 'FAILED'} (${integrityPercentage}% integrity)`
    });

    return apiResponse({
      success: true,
      message: verificationResult.isValid 
        ? "Election chain integrity verified successfully"
        : "Election chain integrity issues detected",
      data: response,
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Vote verification error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify election integrity",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
