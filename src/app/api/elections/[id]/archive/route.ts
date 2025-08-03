import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { z } from "zod";

// Schema for archiving election
const archiveElectionSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters").optional()
});

// Handle POST request to archive an election
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to archive elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can archive elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const electionId = parseInt(params.id);
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateWithZod(archiveElectionSchema, body);
    if (!('data' in validation)) return validation;

    const { reason } = validation.data;

    // Fetch current election data
    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        status: true,
        isLive: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true,
            name: true
          }
        },
        schedule: {
          select: {
            dateStart: true,
            dateFinish: true
          }
        },
        _count: {
          select: {
            voters: true,
            candidates: true,
            positions: true,
            parties: true,
            voteResponses: true
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
        message: "You can only archive your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if election can be archived
    if (election.status === ELECTION_STATUS.ARCHIVED) {
      return apiResponse({
        success: false,
        message: "Election is already archived",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Only closed elections can be archived (or draft elections with no activity)
    if (election.status === ELECTION_STATUS.ACTIVE || election.status === ELECTION_STATUS.PAUSED) {
      return apiResponse({
        success: false,
        message: `Cannot archive an ${election.status.toLowerCase()} election. Close the election first.`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // For draft elections, check if there's any activity
    if (election.status === ELECTION_STATUS.DRAFT) {
      if (election._count.voteResponses > 0) {
        return apiResponse({
          success: false,
          message: "Cannot archive a draft election that has received votes. Close it first.",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Get final election statistics
    const finalStats = {
      totalVoters: election._count.voters,
      totalCandidates: election._count.candidates,
      totalPositions: election._count.positions,
      totalParties: election._count.parties,
      totalVotes: election._count.voteResponses,
      duration: election.schedule ? {
        startDate: election.schedule.dateStart,
        endDate: election.schedule.dateFinish,
        durationDays: Math.ceil((election.schedule.dateFinish.getTime() - election.schedule.dateStart.getTime()) / (1000 * 60 * 60 * 24))
      } : null,
      electionAge: Math.ceil((new Date().getTime() - election.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };

    // Get voting breakdown by position
    const votingBreakdown = await db.voteResponse.groupBy({
      by: ['positionId'],
      where: {
        electionId
      },
      _count: {
        id: true
      }
    });

    const positionStats = await Promise.all(
      votingBreakdown.map(async (stat) => {
        const position = await db.position.findUnique({
          where: { id: stat.positionId },
          select: { 
            name: true,
            numOfWinners: true,
            _count: {
              select: {
                candidates: true
              }
            }
          }
        });
        return {
          positionId: stat.positionId,
          positionName: position?.name || 'Unknown',
          voteCount: stat._count.id,
          candidateCount: position?._count.candidates || 0,
          winnerSlots: position?.numOfWinners || 1
        };
      })
    );

    // Archive the election
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: {
        status: ELECTION_STATUS.ARCHIVED,
        isLive: false,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        status: true,
        isLive: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ELECTION",
      resourceId: electionId,
      message: `Archived election: ${election.name}${reason ? ` - Reason: ${reason}` : ''}`,
      changedFields: {
        status: { old: election.status, new: ELECTION_STATUS.ARCHIVED },
        isLive: { old: election.isLive, new: false }
      }
    });

    return apiResponse({
      success: true,
      message: "Election archived successfully",
      data: {
        election: updatedElection,
        previousStatus: election.status,
        reason: reason || null,
        finalStats,
        positionStats,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election archive error:", error);
    return apiResponse({
      success: false,
      message: "Failed to archive election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
