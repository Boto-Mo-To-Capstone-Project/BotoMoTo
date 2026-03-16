// Election results endpoint (GET) - One-time fetch for live dashboard
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { getElectionResultsRefreshConfig } from "@/lib/elections/resultsRefreshConfig";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Verify election exists and can show results
    const election = await db.election.findFirst({
      where: {
        id: electionId,
        isDeleted: false,
        // Allow results for both active and closed elections
        status: { in: [ELECTION_STATUS.ACTIVE, ELECTION_STATUS.CLOSED] }
      },
      select: {
        id: true,
        name: true,
        instanceName: true,
        status: true,
        organization: {
          select: { id: true, name: true }
        },
        schedule: true
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found, deleted, or not yet active",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Fetch comprehensive election results
    const [
      // Voter statistics
      totalVoters,
      votersWhoVoted,
      
      // Position results with vote counts
      positionResults,
      
      // Voting scope statistics
      scopeStats,
      
      // Recent vote activity (last 5 minutes)
      recentVotes
    ] = await Promise.all([
      // Total registered voters
      db.voter.count({
        where: { electionId, isDeleted: false, isActive: true }
      }),
      
      // Voters who have voted
      db.voter.count({
        where: { 
          electionId, 
          isDeleted: false, 
          voteResponses: { some: { electionId } } 
        }
      }),
      
      // Position results with candidate vote counts
      db.position.findMany({
        where: { electionId, isDeleted: false },
        include: {
          candidates: {
            where: { isDeleted: false },
            select: {
              id: true,
              imageObjectKey: true,
              voter: {
                select: { firstName: true, middleName: true, lastName: true }
              },
              party: {
                select: { id: true, name: true, color: true }
              },
              _count: {
                select: {
                  voteResponses: {
                    where: {
                      electionId
                    }
                  }
                }
              }
            },
            orderBy: {
              voteResponses: {
                _count: 'desc' // Order by vote count
              }
            }
          },
          votingScope: {
            select: { id: true, name: true }
          }
        },
        orderBy: { order: 'asc' }
      }),
      
      // Voting scope breakdown
      db.votingScope.findMany({
        where: { electionId, isDeleted: false },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              voters: {
                where: { 
                  isDeleted: false,
                  voteResponses: { some: { electionId } }
                }
              }
            }
          }
        }
      }),
      
      // Recent voting activity (last 5 minutes)
      db.voteResponse.count({
        where: {
          electionId,
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000)
          }
        }
      })
    ]);

    // Process and format the results
    const refreshConfig = getElectionResultsRefreshConfig();
    const results = {
      overview: {
        totalVoters,
        votersWhoVoted,
        voterTurnout: totalVoters > 0 ? Math.round((votersWhoVoted / totalVoters) * 100) : 0,
        recentVotes
      },
      positions: positionResults.map(position => ({
        id: position.id,
        name: position.name,
        voteLimit: position.voteLimit,
        numOfWinners: position.numOfWinners,
        votingScope: position.votingScope,
        candidates: position.candidates.map(candidate => ({
          id: candidate.id,
          name: `${candidate.voter.firstName} ${candidate.voter.middleName || ''} ${candidate.voter.lastName}`.trim(),
          party: candidate.party,
          voteCount: candidate._count.voteResponses,
          percentage: votersWhoVoted > 0 ? Math.round((candidate._count.voteResponses / votersWhoVoted) * 100) : 0,
          image: candidate.imageObjectKey ? `/api/files/${candidate.imageObjectKey}` : null
        }))
      })),
      demographics: scopeStats.map(scope => ({
        id: scope.id,
        name: scope.name,
        votersWhoVoted: scope._count.voters,
        percentage: totalVoters > 0 ? Math.round((scope._count.voters / totalVoters) * 100) : 0
      })),
      election: {
        id: election.id,
        name: election.name,
        instanceName: election.instanceName,
        status: election.status,
        organization: election.organization.name,
        schedule: election.schedule
      },
      refreshConfig,
      timestamp: new Date().toISOString()
    };

    return apiResponse({
      success: true,
      message: "Election results fetched successfully",
      data: results,
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election results fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch election results",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
