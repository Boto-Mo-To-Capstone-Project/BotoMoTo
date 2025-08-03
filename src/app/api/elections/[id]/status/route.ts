// Election status management endpoint (PATCH)
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to change election status",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

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

    // Parse request body
    const body = await request.json();
    const { action } = body;
    
    if (!action || !["close", "archive", "open", "pause", "resume"].includes(action)) {
      return apiResponse({
        success: false,
        message: "Invalid action. Must be 'close', 'archive', 'open', 'pause', or 'resume'",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            adminId: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
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

    // Admin can only change status of their own elections, superadmin can change others
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only change status of elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only admin and superadmin can access this endpoint
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to change election status",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Determine new status based on action
    let newStatus: string;
    let validTransitions: string[] = [];

    switch (action) {
      case "close":
        newStatus = ELECTION_STATUS.CLOSED;
        validTransitions = [ELECTION_STATUS.ACTIVE, ELECTION_STATUS.PAUSED];
        break;
      case "archive":
        newStatus = ELECTION_STATUS.ARCHIVED;
        validTransitions = [ELECTION_STATUS.CLOSED];
        break;
      case "open":
        newStatus = ELECTION_STATUS.ACTIVE;
        validTransitions = [ELECTION_STATUS.DRAFT];
        break;
      case "pause":
        newStatus = ELECTION_STATUS.PAUSED;
        validTransitions = [ELECTION_STATUS.ACTIVE];
        break;
      case "resume":
        newStatus = ELECTION_STATUS.ACTIVE;
        validTransitions = [ELECTION_STATUS.PAUSED];
        break;
      default:
        return apiResponse({
          success: false,
          message: "Invalid action",
          data: null,
          error: "Bad Request",
          status: 400
        });
    }

    // Check if current status allows the transition
    if (!validTransitions.includes(election.status)) {
      return apiResponse({
        success: false,
        message: `Cannot ${action} election from ${election.status} status`,
        data: { 
          currentStatus: election.status,
          validTransitions
        },
        error: "Bad Request",
        status: 400
      });
    }

    // Update election status
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: { status: newStatus as any },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        schedule: true,
        mfaSettings: true,
      },
    });

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ELECTION",
      resourceId: updatedElection.id,
      changedFields: {
        status: { old: election.status, new: newStatus }
      },
      message: `${action.charAt(0).toUpperCase() + action.slice(1)}d election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Election ${action}d successfully`,
      data: {
        election: {
          id: updatedElection.id,
          name: updatedElection.name,
          status: updatedElection.status,
          organizationName: updatedElection.organization.name
        },
        action,
        previousStatus: election.status,
        newStatus,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election status change error:", error);
    return apiResponse({
      success: false,
      message: "Failed to change election status",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
