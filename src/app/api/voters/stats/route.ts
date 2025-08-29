import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch voter statistics
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
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
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view statistics for your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get comprehensive voter statistics
    const [
      totalVoters,
      activeVoters,
      inactiveVoters,
      votersWhoVoted,
      votersWhoHaventVoted,
      verifiedVoters,
      unverifiedVoters,
      codeStatusStats,
      recentVotes
    ] = await Promise.all([
      // Total voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false }
      }),
      
      // Active voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isActive: true }
      }),
      
      // Inactive voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isActive: false }
      }),
      
      // Voters who voted (exists VoteResponse)
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, voteResponses: { some: { electionId: electionIdInt } } }
      }),
      
      // Voters who haven't voted
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, voteResponses: { none: { electionId: electionIdInt } } }
      }),
      
      // Verified voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isVerified: true }
      }),
      
      // Unverified voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isVerified: false }
      }),
      
      // Code send status stats
      db.voter.groupBy({
        by: ['codeSendStatus'],
        where: { electionId: electionIdInt, isDeleted: false },
        _count: true
      }),
      
      // Recent votes (last 24 hours)
      db.voteResponse.count({
        where: {
          electionId: electionIdInt,
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Process voting scope statistics via aggregation per scope
    const scopes = await db.votingScope.findMany({
      where: { electionId: electionIdInt, isDeleted: false },
      select: { id: true, name: true, _count: { select: { voters: { where: { isDeleted: false } } } } }
    });

    // Count votes per scope by joining voters -> voteResponses
    const votesPerScope = await db.voter.groupBy({
      by: ['votingScopeId'],
      where: { electionId: electionIdInt, isDeleted: false },
      _count: {
        _all: true
      }
    });

    const votedCountsPerScopeRaw = await db.voter.groupBy({
      by: ['votingScopeId'],
      where: { electionId: electionIdInt, isDeleted: false, voteResponses: { some: { electionId: electionIdInt } } },
      _count: { _all: true }
    });

    const votedCountsMap = new Map<number | null, number>();
    for (const row of votedCountsPerScopeRaw) {
      votedCountsMap.set(row.votingScopeId as any, row._count._all as any);
    }

    const votingScopeStats = scopes.map(scope => {
      const totalInScope = scope._count.voters;
      const votedInScope = votedCountsMap.get(scope.id) || 0;
      return {
        id: scope.id,
        name: scope.name,
        totalVoters: totalInScope,
        votedCount: votedInScope,
        pendingCount: totalInScope - votedInScope,
        votingPercentage: totalInScope > 0 ? Math.round((votedInScope / totalInScope) * 100) : 0
      };
    });

    // Handle unassigned voters
    const unassignedTotal = votesPerScope.find(s => s.votingScopeId === null)?._count._all || 0;
    const unassignedVoted = votedCountsMap.get(null) || 0;
    if (unassignedTotal > 0) {
      votingScopeStats.push({
        id: -1,
        name: "Unassigned",
        totalVoters: unassignedTotal,
        votedCount: unassignedVoted,
        pendingCount: unassignedTotal - unassignedVoted,
        votingPercentage: unassignedTotal > 0 ? Math.round((unassignedVoted / unassignedTotal) * 100) : 0
      });
    }

    // Calculate overall statistics
    const overallVotingPercentage = totalVoters > 0 ? Math.round((votersWhoVoted / totalVoters) * 100) : 0;
    const verificationPercentage = totalVoters > 0 ? Math.round((verifiedVoters / totalVoters) * 100) : 0;
    const activePercentage = totalVoters > 0 ? Math.round((activeVoters / totalVoters) * 100) : 0;

    // Format code status statistics
    const codeStatusFormatted = codeStatusStats.reduce((acc, stat) => {
      acc[stat.codeSendStatus] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    const statistics = {
      overview: {
        totalVoters,
        activeVoters,
        inactiveVoters,
        activePercentage,
        votersWhoVoted,
        votersWhoHaventVoted,
        overallVotingPercentage,
        verifiedVoters,
        unverifiedVoters,
        verificationPercentage,
        recentVotes
      },
      votingByScope: votingScopeStats,
      codeStatus: codeStatusFormatted,
      trends: {
        // You could add more trend data here
        // like voting rate over time, peak voting hours, etc.
        recentVotingActivity: recentVotes
      }
    };

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTER",
      resourceId: electionIdInt,
      message: `Viewed voter statistics for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Voter statistics retrieved successfully",
      data: {
        statistics,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Voter statistics error:", error);
    return apiResponse({
      success: false,
      message: "Failed to retrieve voter statistics",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
