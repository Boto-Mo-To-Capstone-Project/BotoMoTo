import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch voter statistics
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view voter statistics",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can view voter statistics",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

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
        scopeType: true,
        scopeTypeLabel: true,
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
      votingStatsByScope,
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
      
      // Voters who voted
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, hasVoted: true }
      }),
      
      // Voters who haven't voted
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, hasVoted: false }
      }),
      
      // Verified voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isVerified: true }
      }),
      
      // Unverified voters
      db.voter.count({
        where: { electionId: electionIdInt, isDeleted: false, isVerified: false }
      }),
      
      // Voting stats by scope
      db.voter.groupBy({
        by: ['votingScopeId', 'hasVoted'],
        where: { electionId: electionIdInt, isDeleted: false },
        _count: true
      }),
      
      // Code send status stats
      db.voter.groupBy({
        by: ['codeSendStatus'],
        where: { electionId: electionIdInt, isDeleted: false },
        _count: true
      }),
      
      // Recent votes (last 24 hours)
      db.voter.count({
        where: {
          electionId: electionIdInt,
          isDeleted: false,
          hasVoted: true,
          votedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    // Process voting scope statistics
    const scopeStats = await db.votingScope.findMany({
      where: { electionId: electionIdInt, isDeleted: false },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            voters: {
              where: { isDeleted: false }
            }
          }
        }
      }
    });

    // Calculate voting percentages and organize scope data
    const votingScopeStats = scopeStats.map(scope => {
      const scopeVotingStats = votingStatsByScope.filter(stat => stat.votingScopeId === scope.id);
      const totalInScope = scopeVotingStats.reduce((sum, stat) => sum + stat._count, 0);
      const votedInScope = scopeVotingStats.find(stat => stat.hasVoted)?._count || 0;
      
      return {
        id: scope.id,
        name: scope.name,
        // For backward compatibility, expose a 'type' field derived from election-level label.
        type: election.scopeTypeLabel ?? null,
        totalVoters: scope._count.voters,
        votedCount: votedInScope,
        pendingCount: totalInScope - votedInScope,
        votingPercentage: totalInScope > 0 ? Math.round((votedInScope / totalInScope) * 100) : 0
      };
    });

    // Handle voters not assigned to any scope
    const unassignedStats = votingStatsByScope.filter(stat => stat.votingScopeId === null);
    const unassignedTotal = unassignedStats.reduce((sum, stat) => sum + stat._count, 0);
    const unassignedVoted = unassignedStats.find(stat => stat.hasVoted)?._count || 0;

    if (unassignedTotal > 0) {
      votingScopeStats.push({
        id: -1, // Use -1 to represent unassigned
        name: "Unassigned",
        type: "UNASSIGNED" as any,
        totalVoters: unassignedTotal,
        votedCount: unassignedVoted,
        pendingCount: unassignedTotal - unassignedVoted,
        votingPercentage: Math.round((unassignedVoted / unassignedTotal) * 100)
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
