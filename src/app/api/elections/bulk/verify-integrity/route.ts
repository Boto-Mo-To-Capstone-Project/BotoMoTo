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

// Handle POST request for batch verification of multiple elections
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user - only super admins can perform bulk verification
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
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

    // Parse and validate input
    const body = await request.json();
    const { electionIds, organizationId } = body;

    // If organizationId is provided, get all elections from that organization
    let targetElectionIds: number[] = [];

    if (organizationId) {
      const orgElections = await db.election.findMany({
        where: {
          orgId: organizationId,
          isDeleted: false
        },
        select: { id: true }
      });
      targetElectionIds = orgElections.map(e => e.id);
    } else if (electionIds) {
      if (!Array.isArray(electionIds) || electionIds.length === 0) {
        return apiResponse({
          success: false,
          message: "Election IDs array is required",
          data: null,
          error: "Invalid Input",
          status: 400
        });
      }

      // Validate all election IDs
      for (const id of electionIds) {
        if (!Number.isInteger(id) || id <= 0) {
          return apiResponse({
            success: false,
            message: `Invalid election ID: ${id}`,
            data: null,
            error: "Invalid Parameter",
            status: 400
          });
        }
      }
      targetElectionIds = electionIds;
    } else {
      // If no specific elections or organization provided, verify all elections
      const allElections = await db.election.findMany({
        where: { isDeleted: false },
        select: { id: true }
      });
      targetElectionIds = allElections.map(e => e.id);
    }

    if (targetElectionIds.length === 0) {
      return apiResponse({
        success: true,
        message: "No elections found to verify",
        data: {
          summary: {
            timestamp: new Date().toISOString(),
            electionsVerified: 0,
            overallValid: true,
            totalVotes: 0,
            totalVerified: 0,
            overallIntegrityPercentage: 100
          },
          results: []
        },
        error: null,
        status: 200
      });
    }

    // Get elections info
    const elections = await db.election.findMany({
      where: {
        id: { in: targetElectionIds },
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
            voteResponses: true
          }
        }
      }
    });

    if (elections.length !== targetElectionIds.length) {
      const foundIds = elections.map(e => e.id);
      const missingIds = targetElectionIds.filter(id => !foundIds.includes(id));
      return apiResponse({
        success: false,
        message: `Elections not found: ${missingIds.join(', ')}`,
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Verify each election
    const results = [];
    for (const election of elections) {
      const verificationResult = await verifyVoteChain(election.id);
      const integrityPercentage = verificationResult.totalVotes > 0 
        ? Math.round((verificationResult.verifiedVotes / verificationResult.totalVotes) * 100)
        : 100;

      results.push({
        election: {
          id: election.id,
          name: election.name,
          status: election.status,
          organization: election.organization.name
        },
        verification: {
          isValid: verificationResult.isValid,
          integrityPercentage,
          totalVotes: verificationResult.totalVotes,
          verifiedVotes: verificationResult.verifiedVotes,
          errorCount: verificationResult.errors.length,
          errors: verificationResult.errors.length > 0 ? verificationResult.errors.slice(0, 5) : undefined // Limit errors in bulk response
        }
      });
    }

    const overallValid = results.every(r => r.verification.isValid);
    const totalVotes = results.reduce((sum, r) => sum + r.verification.totalVotes, 0);
    const totalVerified = results.reduce((sum, r) => sum + r.verification.verifiedVotes, 0);
    const failedElections = results.filter(r => !r.verification.isValid);

    // Create audit log for batch verification action
    await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: undefined,
      message: `Bulk election integrity verification - ${results.length} elections verified, ${failedElections.length} failed (${totalVerified}/${totalVotes} votes verified)`
    });

    return apiResponse({
      success: true,
      message: `Verified ${results.length} elections${failedElections.length > 0 ? ` - ${failedElections.length} elections have integrity issues` : ''}`,
      data: {
        summary: {
          timestamp: new Date().toISOString(),
          electionsVerified: results.length,
          overallValid,
          totalVotes,
          totalVerified,
          overallIntegrityPercentage: totalVotes > 0 ? Math.round((totalVerified / totalVotes) * 100) : 100,
          failedElections: failedElections.length,
          organizationBreakdown: organizationId ? undefined : results.reduce((acc, r) => {
            const orgName = r.election.organization;
            if (!acc[orgName]) {
              acc[orgName] = { total: 0, valid: 0, invalid: 0 };
            }
            acc[orgName].total++;
            if (r.verification.isValid) {
              acc[orgName].valid++;
            } else {
              acc[orgName].invalid++;
            }
            return acc;
          }, {} as Record<string, { total: number; valid: number; invalid: number }>)
        },
        results
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Batch verification error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify elections",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
