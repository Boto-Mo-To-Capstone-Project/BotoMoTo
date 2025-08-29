import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch position statistics
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');

    if (!electionId) {
      return apiResponse({
        success: false,
        message: "Election ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Verify election exists and user has access
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        status: true,
        organization: {
          select: {
            id: true,
            adminId: true,
            name: true
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

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view statistics from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get basic position counts
    const totalPositions = await db.position.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    // Get positions with candidate and vote counts
    const positionsWithCounts = await db.position.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        voteLimit: true,
        numOfWinners: true,
        order: true,
        votingScope: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            candidates: true,
            voteResponses: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Calculate statistics
    const positionsWithCandidates = positionsWithCounts.filter(p => p._count.candidates > 0).length;
    const positionsWithVotes = positionsWithCounts.filter(p => p._count.voteResponses > 0).length;
    const totalCandidates = positionsWithCounts.reduce((sum, p) => sum + p._count.candidates, 0);
    const totalVotes = positionsWithCounts.reduce((sum, p) => sum + p._count.voteResponses, 0);

    // Get voting scope distribution
    const votingScopeStats = await db.position.groupBy({
      by: ['votingScopeId'],
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      _count: {
        id: true
      }
    });

    // Get voting scope details
    const votingScopeDetails = await db.votingScope.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true
      }
    });

    const votingScopeDistribution = votingScopeStats.map(stat => {
      const scope = votingScopeDetails.find(vs => vs.id === stat.votingScopeId);
      return {
        votingScopeId: stat.votingScopeId,
        votingScopeName: scope?.name || (stat.votingScopeId ? 'Unknown Scope' : 'No Scope'),
        positionCount: stat._count.id
      };
    });

    // Get vote limit distribution
    const voteLimitStats = await db.position.groupBy({
      by: ['voteLimit'],
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      _count: {
        id: true
      },
      orderBy: {
        voteLimit: 'asc'
      }
    });

    // Get winner count distribution
    const winnerCountStats = await db.position.groupBy({
      by: ['numOfWinners'],
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      _count: {
        id: true
      },
      orderBy: {
        numOfWinners: 'asc'
      }
    });

    // Calculate competition metrics
    const competitionMetrics = positionsWithCounts.map(position => ({
      positionId: position.id,
      positionName: position.name,
      candidateCount: position._count.candidates,
      winnerSlots: position.numOfWinners,
      competitionRatio: position.numOfWinners > 0 ? 
        Math.round((position._count.candidates / position.numOfWinners) * 100) / 100 : 0,
      voteCount: position._count.voteResponses,
      votingScope: position.votingScope?.name || 'No Scope'
    }));

    // Find positions that need attention
    const positionsNeedingAttention = {
      noCandidate: positionsWithCounts.filter(p => p._count.candidates === 0),
      underContested: positionsWithCounts.filter(p => 
        p._count.candidates > 0 && p._count.candidates < p.numOfWinners
      ),
      uncontested: positionsWithCounts.filter(p => 
        p._count.candidates === p.numOfWinners && p.numOfWinners === 1
      )
    };

    const summary = {
      totalPositions,
      positionsWithCandidates,
      positionsWithVotes,
      positionsWithoutCandidates: totalPositions - positionsWithCandidates,
      positionsWithoutVotes: totalPositions - positionsWithVotes,
      totalCandidates,
      totalVotes,
      averageCandidatesPerPosition: totalPositions > 0 ? 
        Math.round((totalCandidates / totalPositions) * 100) / 100 : 0,
      averageVotesPerPosition: totalPositions > 0 ? 
        Math.round((totalVotes / totalPositions) * 100) / 100 : 0
    };

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "POSITION",
      resourceId: electionIdInt,
      message: `Viewed position statistics for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Position statistics fetched successfully",
      data: {
        election: {
          id: election.id,
          name: election.name,
          status: election.status
        },
        summary,
        positionsWithCounts,
        votingScopeDistribution,
        voteLimitDistribution: voteLimitStats.map(stat => ({
          voteLimit: stat.voteLimit,
          positionCount: stat._count.id
        })),
        winnerCountDistribution: winnerCountStats.map(stat => ({
          numOfWinners: stat.numOfWinners,
          positionCount: stat._count.id
        })),
        competitionMetrics,
        positionsNeedingAttention: {
          noCandidates: positionsNeedingAttention.noCandidate.map(p => ({
            id: p.id,
            name: p.name,
            votingScope: p.votingScope?.name || 'No Scope'
          })),
          underContested: positionsNeedingAttention.underContested.map(p => ({
            id: p.id,
            name: p.name,
            candidateCount: p._count.candidates,
            winnerSlots: p.numOfWinners,
            votingScope: p.votingScope?.name || 'No Scope'
          })),
          uncontested: positionsNeedingAttention.uncontested.map(p => ({
            id: p.id,
            name: p.name,
            candidateCount: p._count.candidates,
            votingScope: p.votingScope?.name || 'No Scope'
          }))
        },
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Position statistics error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch position statistics",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
