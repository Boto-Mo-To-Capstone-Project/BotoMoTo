import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";

// Handle POST request to open/activate an election
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
        message: "You must be logged in to open elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can open elections",
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
        message: "You can only open your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to open elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if election can be opened
    if (election.status === ELECTION_STATUS.ACTIVE) {
      return apiResponse({
        success: false,
        message: "Election is already active",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (election.status === ELECTION_STATUS.CLOSED || election.status === ELECTION_STATUS.ARCHIVED) {
      return apiResponse({
        success: false,
        message: `Cannot open a ${election.status.toLowerCase()} election`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate election readiness
    const readinessIssues: string[] = [];

    // Check if election has positions
    if (election._count.positions === 0) {
      readinessIssues.push("Election must have at least one position");
    }

    // Check if positions have candidates
    const positionsWithoutCandidates = await db.position.findMany({
      where: {
        electionId,
        isDeleted: false,
        candidates: {
          none: {
            isDeleted: false
          }
        }
      },
      select: {
        name: true
      }
    });

    if (positionsWithoutCandidates.length > 0) {
      const positionNames = positionsWithoutCandidates.map(p => p.name).join(', ');
      readinessIssues.push(`The following positions have no candidates: ${positionNames}`);
    }

    // Check if election has voters
    if (election._count.voters === 0) {
      readinessIssues.push("Election must have at least one voter");
    }

    // Check active voters
    const activeVoterCount = await db.voter.count({
      where: {
        electionId,
        isDeleted: false,
        isActive: true
      }
    });

    if (activeVoterCount === 0) {
      readinessIssues.push("Election must have at least one active voter");
    }

    // Check if election has schedule
    if (!election.schedule) {
      readinessIssues.push("Election must have a schedule with start and end dates");
    } else {
      const now = new Date();
      if (election.schedule.dateStart > now) {
        readinessIssues.push("Election start date is in the future");
      }
      if (election.schedule.dateFinish <= now) {
        readinessIssues.push("Election end date has already passed");
      }
      if (election.schedule.dateStart >= election.schedule.dateFinish) {
        readinessIssues.push("Election start date must be before end date");
      }
    }

    // If there are readiness issues, return error
    if (readinessIssues.length > 0) {
      return apiResponse({
        success: false,
        message: `Cannot open election due to the following issues: ${readinessIssues.join(', ')}`,
        data: {
          issues: readinessIssues,
          election: {
            id: election.id,
            name: election.name,
            status: election.status
          }
        },
        error: "Bad Request",
        status: 400
      });
    }

    // Open the election
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: {
        status: ELECTION_STATUS.ACTIVE,
        isLive: true,
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
      message: `Opened election: ${election.name}`,
      changedFields: {
        status: { old: election.status, new: ELECTION_STATUS.ACTIVE },
        isLive: { old: election.isLive, new: true }
      }
    });

    return apiResponse({
      success: true,
      message: "Election opened successfully",
      data: {
        election: updatedElection,
        previousStatus: election.status,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election open error:", error);
    return apiResponse({
      success: false,
      message: "Failed to open election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
