import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { z } from "zod";

// Schema for election status updates
const electionStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED"], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status value"
  }),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be at most 500 characters").optional()
});

// Handle PUT request to update election status
export async function PUT(
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
        message: "You must be logged in to update election status",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update election status",
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
    const validation = validateWithZod(electionStatusSchema, body);
    if (!('data' in validation)) return validation;

    const { status: newStatus, reason } = validation.data;

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
        message: "You can only update status of your organization's elections",
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

    const currentStatus = election.status;

    // Check if status change is valid
    const statusValidation = validateStatusTransition(currentStatus, newStatus, election);
    if (!statusValidation.valid) {
      return apiResponse({
        success: false,
        message: statusValidation.message,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Perform additional checks based on new status
    if (newStatus === ELECTION_STATUS.ACTIVE) {
      // Validate election is ready to be activated
      const readinessCheck = await validateElectionReadiness(electionId);
      if (!readinessCheck.ready) {
        return apiResponse({
          success: false,
          message: `Cannot activate election: ${readinessCheck.reasons.join(', ')}`,
          data: {
            missingRequirements: readinessCheck.reasons
          },
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Update election status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Handle live status based on election status
    if (newStatus === ELECTION_STATUS.ACTIVE) {
      updateData.isLive = true;
    } else if (newStatus === ELECTION_STATUS.PAUSED || newStatus === ELECTION_STATUS.CLOSED || newStatus === ELECTION_STATUS.ARCHIVED) {
      updateData.isLive = false;
    }

    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: updateData,
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
      message: `Changed election status from ${currentStatus} to ${newStatus}${reason ? ` - Reason: ${reason}` : ''}`,
      changedFields: {
        status: { old: currentStatus, new: newStatus },
        isLive: { old: election.isLive, new: updateData.isLive }
      }
    });

    return apiResponse({
      success: true,
      message: `Election status updated to ${newStatus} successfully`,
      data: {
        election: updatedElection,
        previousStatus: currentStatus,
        reason: reason || null,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election status update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update election status",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle GET request to get election status information
export async function GET(
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
        message: "You must be logged in to view election status",
        data: null,
        error: "Unauthorized",
        status: 401
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

    // Fetch election data
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
        updatedAt: true,
        organization: {
          select: {
            id: true,
            adminId: true,
            name: true,
            status: true
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

    // Check if user has access to this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view status of your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get available status transitions
    const availableTransitions = getAvailableStatusTransitions(election.status, election);

    // Check election readiness if not active
    let readinessCheck = null;
    if (election.status !== ELECTION_STATUS.ACTIVE) {
      readinessCheck = await validateElectionReadiness(electionId);
    }

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: electionId,
      message: `Viewed election status: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election status information fetched successfully",
      data: {
        election: {
          id: election.id,
          name: election.name,
          status: election.status,
          isLive: election.isLive,
          createdAt: election.createdAt,
          updatedAt: election.updatedAt,
          organization: election.organization,
          schedule: election.schedule,
          counts: election._count
        },
        statusInfo: {
          current: election.status,
          availableTransitions,
          readinessCheck
        },
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Election status fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch election status",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Utility function to validate status transitions
function validateStatusTransition(currentStatus: string, newStatus: string, election: any): { valid: boolean; message: string } {
  // Same status
  if (currentStatus === newStatus) {
    return { valid: false, message: "Election is already in this status" };
  }

  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    [ELECTION_STATUS.DRAFT]: [ELECTION_STATUS.ACTIVE],
    [ELECTION_STATUS.ACTIVE]: [ELECTION_STATUS.PAUSED, ELECTION_STATUS.CLOSED],
    [ELECTION_STATUS.PAUSED]: [ELECTION_STATUS.ACTIVE, ELECTION_STATUS.CLOSED],
    [ELECTION_STATUS.CLOSED]: [ELECTION_STATUS.ARCHIVED],
    [ELECTION_STATUS.ARCHIVED]: [] // No transitions from archived
  };

  const allowedTransitions = validTransitions[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `Cannot change status from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'None'}`
    };
  }

  // Additional checks for specific transitions
  if (newStatus === ELECTION_STATUS.CLOSED && election._count.voteResponses === 0) {
    return {
      valid: false,
      message: "Cannot close an election with no votes. Consider archiving instead."
    };
  }

  return { valid: true, message: "Valid transition" };
}

// Utility function to get available status transitions
function getAvailableStatusTransitions(currentStatus: string, election: any): Array<{ status: string; label: string; description: string }> {
  const transitions: Record<string, Array<{ status: string; label: string; description: string }>> = {
    [ELECTION_STATUS.DRAFT]: [
      {
        status: ELECTION_STATUS.ACTIVE,
        label: "Activate Election",
        description: "Make the election live and allow voting to begin"
      }
    ],
    [ELECTION_STATUS.ACTIVE]: [
      {
        status: ELECTION_STATUS.PAUSED,
        label: "Pause Election",
        description: "Temporarily pause voting while keeping the election active"
      },
      {
        status: ELECTION_STATUS.CLOSED,
        label: "Close Election",
        description: "End voting and close the election"
      }
    ],
    [ELECTION_STATUS.PAUSED]: [
      {
        status: ELECTION_STATUS.ACTIVE,
        label: "Resume Election",
        description: "Resume voting and make the election active again"
      },
      {
        status: ELECTION_STATUS.CLOSED,
        label: "Close Election",
        description: "End voting and close the election"
      }
    ],
    [ELECTION_STATUS.CLOSED]: [
      {
        status: ELECTION_STATUS.ARCHIVED,
        label: "Archive Election",
        description: "Archive the election for long-term storage"
      }
    ],
    [ELECTION_STATUS.ARCHIVED]: []
  };

  return transitions[currentStatus] || [];
}

// Utility function to validate election readiness
async function validateElectionReadiness(electionId: number): Promise<{ ready: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // Check if election has positions
  const positionCount = await db.position.count({
    where: {
      electionId,
      isDeleted: false
    }
  });

  if (positionCount === 0) {
    reasons.push("Election must have at least one position");
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
    reasons.push(`The following positions have no candidates: ${positionNames}`);
  }

  // Check if election has voters
  const voterCount = await db.voter.count({
    where: {
      electionId,
      isDeleted: false,
      isActive: true
    }
  });

  if (voterCount === 0) {
    reasons.push("Election must have at least one active voter");
  }

  // Check if election has schedule
  const schedule = await db.electionSched.findUnique({
    where: {
      electionId
    }
  });

  if (!schedule) {
    reasons.push("Election must have a schedule with start and end dates");
  } else {
    const now = new Date();
    if (schedule.dateStart > now) {
      reasons.push("Election start date is in the future");
    }
    if (schedule.dateFinish <= now) {
      reasons.push("Election end date has already passed");
    }
    if (schedule.dateStart >= schedule.dateFinish) {
      reasons.push("Election start date must be before end date");
    }
  }

  return {
    ready: reasons.length === 0,
    reasons
  };
}
