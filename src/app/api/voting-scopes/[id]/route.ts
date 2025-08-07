// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { votingScopeUpdateSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch a specific voting scope
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
        message: "You must be logged in to view this voting scope",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const votingScopeId = parseInt(params.id);
    if (isNaN(votingScopeId)) {
      return apiResponse({
        success: false,
        message: "Invalid voting scope ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch voting scope with election and organization info (exclude soft-deleted)
    const votingScope = await db.votingScope.findUnique({
      where: {
        id: votingScopeId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                name: true,
                adminId: true,
                admin: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            voters: true,
            positions: true
          }
        }
      },
    });

    if (!votingScope || votingScope.isDeleted || votingScope.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voting scope not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions
    if (user.role === ROLES.ADMIN && votingScope.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view voting scopes from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Deny access for voters
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view this voting scope",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTING_SCOPE",
      resourceId: votingScope.id,
      message: `Viewed voting scope: ${votingScope.name}`,
    });

    return apiResponse({
      success: true,
      message: "Voting scope fetched successfully",
      data: {
        votingScope,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voting scope fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch voting scope",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific voting scope
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
        message: "You must be logged in to update voting scopes",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update voting scopes",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const votingScopeId = parseInt(params.id);
    if (isNaN(votingScopeId)) {
      return apiResponse({
        success: false,
        message: "Invalid voting scope ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(votingScopeUpdateSchema, body);
    if (!('data' in validation)) return validation;
    const { name, type, description } = validation.data;

    // Fetch existing voting scope (exclude soft-deleted)
    const existingVotingScope = await db.votingScope.findUnique({
      where: {
        id: votingScopeId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!existingVotingScope || existingVotingScope.isDeleted || existingVotingScope.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voting scope not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this voting scope (through organization)
    if (user.role === ROLES.ADMIN && existingVotingScope.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update voting scopes from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if voting scope name already exists in this election (excluding current voting scope and soft-deleted)
    if (name !== existingVotingScope.name) {
      const nameExists = await db.votingScope.findFirst({
        where: {
          electionId: existingVotingScope.electionId,
          name,
          id: { not: votingScopeId },
          isDeleted: false
        }
      });

      if (nameExists) {
        return apiResponse({
          success: false,
          message: "A voting scope with this name already exists in this election",
          data: null,
          error: "Already exists",
          status: 400
        });
      }
    }

    // Update voting scope
    const updatedVotingScope = await db.votingScope.update({
      where: { id: votingScopeId },
      data: { 
        name, 
        type, 
        description 
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
      },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "type", "description"] as const) {
      if (existingVotingScope[key] !== updatedVotingScope[key]) {
        changedFields[key] = { old: existingVotingScope[key], new: updatedVotingScope[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "VOTING_SCOPE",
      resourceId: updatedVotingScope.id,
      changedFields,
    });

    return apiResponse({
      success: true,
      message: "Voting scope updated successfully",
      data: {
        votingScope: updatedVotingScope,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voting scope update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update voting scope",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete a specific voting scope
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
        message: "You must be logged in to delete voting scopes",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete voting scopes",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const votingScopeId = parseInt(params.id);
    if (isNaN(votingScopeId)) {
      return apiResponse({
        success: false,
        message: "Invalid voting scope ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch existing voting scope (exclude soft-deleted)
    const existingVotingScope = await db.votingScope.findUnique({
      where: {
        id: votingScopeId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!existingVotingScope || existingVotingScope.isDeleted || existingVotingScope.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voting scope not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this voting scope (through organization)
    if (user.role === ROLES.ADMIN && existingVotingScope.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete voting scopes from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Soft delete voting scope
    const deletedVotingScope = await db.votingScope.update({
      where: { id: votingScopeId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "VOTING_SCOPE",
      resourceId: deletedVotingScope.id,
      message: `Soft deleted voting scope: ${existingVotingScope.name}`,
    });

    return apiResponse({
      success: true,
      message: "Voting scope soft deleted successfully",
      data: {
        votingScope: deletedVotingScope,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voting scope deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete voting scope",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
