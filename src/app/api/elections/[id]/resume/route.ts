import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";

// Handle POST request to resume a paused election
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
        message: "You must be logged in to resume elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can resume elections",
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
        message: "You can only resume your organization's elections",
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

    // Check if election can be resumed
    if (election.status !== ELECTION_STATUS.PAUSED) {
      return apiResponse({
        success: false,
        message: `Cannot resume election with status: ${election.status}. Only paused elections can be resumed.`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election schedule is still valid
    const resumeIssues: string[] = [];
    
    if (election.schedule) {
      const now = new Date();
      if (election.schedule.dateFinish <= now) {
        resumeIssues.push("Election end date has already passed");
      }
      if (election.schedule.dateStart >= election.schedule.dateFinish) {
        resumeIssues.push("Election start date must be before end date");
      }
    } else {
      resumeIssues.push("Election schedule is required to resume");
    }

    // If there are issues, return error
    if (resumeIssues.length > 0) {
      return apiResponse({
        success: false,
        message: `Cannot resume election: ${resumeIssues.join(', ')}`,
        data: {
          issues: resumeIssues,
          election: {
            id: election.id,
            name: election.name,
            status: election.status,
            schedule: election.schedule
          }
        },
        error: "Bad Request",
        status: 400
      });
    }

    // Resume the election
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
      message: `Resumed election: ${election.name}`,
      changedFields: {
        status: { old: election.status, new: ELECTION_STATUS.ACTIVE },
        isLive: { old: election.isLive, new: true }
      }
    });

    return apiResponse({
      success: true,
      message: "Election resumed successfully",
      data: {
        election: updatedElection,
        previousStatus: election.status,
        voteCount: election._count.voteResponses,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election resume error:", error);
    return apiResponse({
      success: false,
      message: "Failed to resume election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
