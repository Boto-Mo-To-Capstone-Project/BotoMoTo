import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { z } from "zod";

// Schema for pausing election
const pauseElectionSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters")
});

// Handle POST request to pause an active election
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
        message: "You must be logged in to pause elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can pause elections",
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
    const validation = validateWithZod(pauseElectionSchema, body);
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
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true,
            name: true
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
        message: "You can only pause your organization's elections",
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

    // Check if election can be paused
    if (election.status !== ELECTION_STATUS.ACTIVE) {
      return apiResponse({
        success: false,
        message: `Cannot pause election with status: ${election.status}. Only active elections can be paused.`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Pause the election
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: {
        status: ELECTION_STATUS.PAUSED,
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
      message: `Paused election: ${election.name} - Reason: ${reason}`,
      changedFields: {
        status: { old: election.status, new: ELECTION_STATUS.PAUSED },
        isLive: { old: election.isLive, new: false }
      }
    });

    return apiResponse({
      success: true,
      message: "Election paused successfully",
      data: {
        election: updatedElection,
        previousStatus: election.status,
        reason,
        voteCount: election._count.voteResponses,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election pause error:", error);
    return apiResponse({
      success: false,
      message: "Failed to pause election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
