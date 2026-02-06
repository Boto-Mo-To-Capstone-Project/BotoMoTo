// Election status management endpoint (PATCH)
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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
    
    if (!action || !["close", "open"].includes(action)) {
      return apiResponse({
        success: false,
        message: "Invalid action. Must be 'close' or 'open'",
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

    // Determine new status based on action
    let newStatus: string;
    let validTransitions: string[] = [];

    switch (action) {
      case "close":
        newStatus = ELECTION_STATUS.CLOSED;
        validTransitions = [ELECTION_STATUS.ACTIVE];
        break;
      case "open":
        newStatus = ELECTION_STATUS.ACTIVE;
        validTransitions = [ELECTION_STATUS.DRAFT, ELECTION_STATUS.CLOSED];
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

    // If closing election, invalidate all active voter sessions
    if (action === "close") {
      await db.voterSession.updateMany({
        where: {
          voter: {
            electionId: electionId
          },
          isActive: true
        },
        data: {
          isActive: false,
          lastActiveAt: new Date()
        }
      });
      console.log(`Invalidated all active voter sessions for election ${electionId}`);
    }

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
