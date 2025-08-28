import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch candidate statistics
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

    // Get basic candidate counts
    const totalCandidates = await db.candidate.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    const newCandidates = await db.candidate.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        isNew: true
      }
    });

    const candidatesWithImage = await db.candidate.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        imageUrl: { not: null }
      }
    });

    const candidatesWithCredentials = await db.candidate.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        credentialUrl: { not: null }
      }
    });

    const candidatesWithVotes = await db.candidate.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        voteResponses: { some: {} }
      }
    });

    // Get candidates with detailed counts
    const candidatesWithCounts = await db.candidate.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        isNew: true,
        imageUrl: true,
        credentialUrl: true,
        voter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        position: {
          select: {
            id: true,
            name: true,
            numOfWinners: true
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            voteResponses: true,
          }
        }
      },
      orderBy: [
        { position: { order: 'asc' } },
        { voter: { lastName: 'asc' } }
      ]
    });

    // Calculate total votes
    const totalVotes = candidatesWithCounts.reduce((sum, c) => sum + c._count.voteResponses, 0);

    // Group candidates by position
    const candidatesByPosition = await db.candidate.groupBy({
      by: ['positionId'],
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      _count: {
        id: true
      }
    });

    // Get position details for grouping
    const positionDetails = await db.position.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        numOfWinners: true,
        order: true
      }
    });

    const positionDistribution = candidatesByPosition.map(stat => {
      const position = positionDetails.find(p => p.id === stat.positionId);
      return {
        positionId: stat.positionId,
        positionName: position?.name || 'Unknown Position',
        candidateCount: stat._count.id,
        winnerSlots: position?.numOfWinners || 0,
        competitionRatio: position?.numOfWinners ? 
          Math.round((stat._count.id / position.numOfWinners) * 100) / 100 : 0
      };
    }).sort((a, b) => {
      const posA = positionDetails.find(p => p.id === a.positionId);
      const posB = positionDetails.find(p => p.id === b.positionId);
      return (posA?.order || 0) - (posB?.order || 0);
    });

    // Group candidates by party
    const candidatesByParty = await db.candidate.groupBy({
      by: ['partyId'],
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      _count: {
        id: true
      }
    });

    // Get party details for grouping
    const partyDetails = await db.party.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        color: true
      }
    });

    const partyDistribution = candidatesByParty.map(stat => {
      const party = partyDetails.find(p => p.id === stat.partyId);
      return {
        partyId: stat.partyId,
        partyName: party?.name || (stat.partyId ? 'Unknown Party' : 'Independent'),
        partyColor: party?.color || null,
        candidateCount: stat._count.id
      };
    }).sort((a, b) => b.candidateCount - a.candidateCount);

    // Calculate experience metrics
    const experienceMetrics = candidatesWithCounts.map(candidate => ({
      candidateId: candidate.id,
      candidateName: `${candidate.voter.firstName} ${candidate.voter.lastName}`,
      position: candidate.position.name,
      party: candidate.party?.name || 'Independent',
      voteCount: candidate._count.voteResponses,
      isNew: candidate.isNew
    }));

    // Find candidates that need attention
    const candidatesNeedingAttention = {
      missingImage: candidatesWithCounts.filter(c => !c.imageUrl),
      missingCredential: candidatesWithCounts.filter(c => !c.credentialUrl),
    };

    // Calculate competition analysis
    const competitionAnalysis = positionDistribution.map(pos => {
      const positionCandidates = candidatesWithCounts.filter(c => c.position.id === pos.positionId);
      const totalVotesForPosition = positionCandidates.reduce((sum, c) => sum + c._count.voteResponses, 0);
      
      return {
        positionId: pos.positionId,
        positionName: pos.positionName,
        candidateCount: pos.candidateCount,
        winnerSlots: pos.winnerSlots,
        competitionRatio: pos.competitionRatio,
        totalVotes: totalVotesForPosition,
        isContested: pos.candidateCount > pos.winnerSlots,
        isUncontested: pos.candidateCount === pos.winnerSlots && pos.winnerSlots === 1,
        needsMoreCandidates: pos.candidateCount < pos.winnerSlots,
        averageVotesPerCandidate: pos.candidateCount > 0 ? 
          Math.round((totalVotesForPosition / pos.candidateCount) * 100) / 100 : 0
      };
    });

    const summary = {
      totalCandidates,
      newCandidates,
      candidatesWithImage,
      candidatesWithVotes,
      candidatesWithoutImage: totalCandidates - candidatesWithImage,
      candidatesWithoutVotes: totalCandidates - candidatesWithVotes,
      totalVotes,
      averageVotesPerCandidate: totalCandidates > 0 ? 
        Math.round((totalVotes / totalCandidates) * 100) / 100 : 0,
      profileCompletionRate: totalCandidates > 0 ? 
        Math.round(((candidatesWithCredentials + candidatesWithImage) / (totalCandidates * 2)) * 100) : 0,
      totalPositions: positionDetails.length,
      totalParties: partyDetails.length,
      independentCandidates: candidatesByParty.find(p => p.partyId === null)?._count.id || 0
    };

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "CANDIDATE",
      resourceId: electionIdInt,
      message: `Viewed candidate statistics for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate statistics fetched successfully",
      data: {
        election: {
          id: election.id,
          name: election.name,
          status: election.status
        },
        summary,
        candidatesWithCounts,
        positionDistribution,
        partyDistribution,
        experienceMetrics,
        competitionAnalysis,
        candidatesNeedingAttention: {
          missingImage: candidatesNeedingAttention.missingImage.map(c => ({
            id: c.id,
            name: `${c.voter.firstName} ${c.voter.lastName}`,
            position: c.position.name,
            party: c.party?.name || 'Independent'
          })),
          missingCredential: candidatesNeedingAttention.missingCredential.map(c => ({
            id: c.id,
            name: `${c.voter.firstName} ${c.voter.lastName}`,
            position: c.position.name,
            party: c.party?.name || 'Independent'
          }))
        },
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Candidate statistics error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch candidate statistics",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
