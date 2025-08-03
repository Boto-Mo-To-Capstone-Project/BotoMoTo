import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { z } from "zod";

// Schema for closing election
const closeElectionSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters").optional(),
  forceClose: z.boolean().default(false).optional()
});

// Handle POST request to close an election
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
        message: "You must be logged in to close elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can close elections",
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
    const validation = validateWithZod(closeElectionSchema, body);
    if (!('data' in validation)) return validation;

    const { reason, forceClose = false } = validation.data;

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
        message: "You can only close your organization's elections",
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

    // Check if election can be closed
    if (election.status === ELECTION_STATUS.CLOSED) {
      return apiResponse({
        success: false,
        message: "Election is already closed",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (election.status === ELECTION_STATUS.ARCHIVED) {
      return apiResponse({
        success: false,
        message: "Cannot close an archived election",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (election.status === ELECTION_STATUS.DRAFT) {
      return apiResponse({
        success: false,
        message: "Cannot close a draft election. Open it first or delete it.",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if there are any votes (unless force close)
    if (!forceClose && election._count.voteResponses === 0) {
      return apiResponse({
        success: false,
        message: "Election has no votes yet. Are you sure you want to close it? Use forceClose: true to proceed.",
        data: {
          election: {
            id: election.id,
            name: election.name,
            status: election.status,
            voteCount: election._count.voteResponses
          },
          suggestion: "Consider waiting for votes or using the archive action instead"
        },
        error: "Bad Request",
        status: 400
      });
    }

    // Warn if closing before scheduled end time (unless force close)
    if (!forceClose && election.schedule && election.schedule.dateFinish > new Date()) {
      return apiResponse({
        success: false,
        message: "Election is scheduled to end later. Use forceClose: true to close before the scheduled end time.",
        data: {
          election: {
            id: election.id,
            name: election.name,
            status: election.status,
            scheduledEnd: election.schedule.dateFinish
          }
        },
        error: "Bad Request",
        status: 400
      });
    }

    // Get voting statistics before closing
    const votingStats = await db.voteResponse.groupBy({
      by: ['positionId'],
      where: {
        electionId
      },
      _count: {
        id: true
      }
    });

    const positionVoteCounts = await Promise.all(
      votingStats.map(async (stat) => {
        const position = await db.position.findUnique({
          where: { id: stat.positionId },
          select: { name: true }
        });
        return {
          positionId: stat.positionId,
          positionName: position?.name || 'Unknown',
          voteCount: stat._count.id
        };
      })
    );

    // Close the election
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: {
        status: ELECTION_STATUS.CLOSED,
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
        },
        schedule: {
          select: {
            dateStart: true,
            dateFinish: true
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
      message: `Closed election: ${election.name}${reason ? ` - Reason: ${reason}` : ''}${forceClose ? ' (Force close)' : ''}`,
      changedFields: {
        status: { old: election.status, new: ELECTION_STATUS.CLOSED },
        isLive: { old: election.isLive, new: false }
      }
    });

    return apiResponse({
      success: true,
      message: "Election closed successfully",
      data: {
        election: updatedElection,
        previousStatus: election.status,
        reason: reason || null,
        forceClose,
        finalStats: {
          totalVotes: election._count.voteResponses,
          voterCount: election._count.voters,
          positionVoteCounts
        },
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election close error:", error);
    return apiResponse({
      success: false,
      message: "Failed to close election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
