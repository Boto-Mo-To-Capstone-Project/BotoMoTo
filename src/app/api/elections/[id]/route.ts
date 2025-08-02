// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch a specific election
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
        message: "You must be logged in to view this election",
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

    // Fetch election with organization info
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
            email: true,
            adminId: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: {
            voters: true,
            candidates: true,
            positions: true,
            parties: true,
            voteResponses: true
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

    // Check permissions
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Super admin can view any election, admin can only view their own
    if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view this election",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      message: `Viewed election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election fetched successfully",
      data: {
        election,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific election
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
        message: "You must be logged in to update elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update elections",
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

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(electionSchema, body);
    if (!('data' in validation)) return validation;
    const { name, description, status, isLive, allowSurvey } = validation.data;

    // Fetch existing election
    const existingElection = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!existingElection) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && existingElection.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Update election
    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: { 
        name, 
        description, 
        status, 
        isLive, 
        allowSurvey 
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        schedule: true,
        mfaSettings: true,
      },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "description", "status", "isLive", "allowSurvey"] as const) {
      if (existingElection[key] !== updatedElection[key]) {
        changedFields[key] = { old: existingElection[key], new: updatedElection[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ELECTION",
      resourceId: updatedElection.id,
      changedFields,
    });

    return apiResponse({
      success: true,
      message: "Election updated successfully",
      data: {
        election: updatedElection,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to soft-delete a specific election
export async function DELETE(
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
        message: "You must be logged in to delete elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete elections",
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

    // Fetch existing election
    const existingElection = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!existingElection) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && existingElection.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Soft delete election
    const deletedElection = await db.election.update({
      where: { id: electionId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "ELECTION",
      resourceId: deletedElection.id,
      deletionType: "SOFT",
      message: `Deleted election: ${existingElection.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election deleted successfully",
      data: {
        election: deletedElection,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
