// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { votingScopeSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch voting scopes
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view voting scopes",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Deny access for voters
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view voting scopes",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');

    if (!electionId) {
      return apiResponse({
        success: false,
        message: "Election ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and user has permission
    const election = await db.election.findFirst({
      where: {
        id: electionIdInt,
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

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions - admin can only view voting scopes from their organization's elections
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view voting scopes from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Fetch voting scopes for the election (exclude soft-deleted)
    const votingScopes = await db.votingScope.findMany({
      where: { 
        electionId: electionIdInt,
        isDeleted: false
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
        _count: {
          select: {
            voters: true,
            positions: true
          }
        }
      },
      orderBy: { id: "asc" },
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTING_SCOPE",
      resourceId: electionIdInt,
      message: `Viewed voting scopes for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Voting scopes fetched successfully",
      data: {
        votingScopes,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voting scopes fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch voting scopes",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new voting scope
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create a voting scope",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role (only admins can create voting scopes)
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create voting scopes",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate voting scope data using helper (including electionId)
    const validation = validateWithZod(votingScopeSchema, body);
    if (!('data' in validation)) return validation;
    const { electionId, name, description } = validation.data;

    // Check if election exists and user has permission
    const election = await db.election.findFirst({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            adminId: true,
            status: true
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

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only create voting scopes for elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only approved organizations can create voting scopes
    if (election.organization.status !== "APPROVED") {
      return apiResponse({
        success: false,
        message: "You must have an approved organization to create voting scopes",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if voting scope name already exists in this election (exclude soft-deleted)
    const existingVotingScope = await db.votingScope.findFirst({
      where: {
        electionId: electionId,
        name,
        isDeleted: false
      }
    });

    if (existingVotingScope) {
      return apiResponse({
        success: false,
        message: "A voting scope with this name already exists in this election",
        data: null,
        error: "Already exists",
        status: 400
      });
    }

    // Create a new voting scope in the database
    const votingScope = await db.votingScope.create({
      data: {
        electionId: electionId,
        name,
        description,
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

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "VOTING_SCOPE",
      resourceId: votingScope.id,
      newData: votingScope,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "Voting scope created successfully",
      data: {
        votingScope,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Voting scope creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create voting scope",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all voting scopes of a specific election
export async function DELETE(request: NextRequest) {
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

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');

    if (!electionId) {
      return apiResponse({
        success: false,
        message: "Election ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if election exists and user has permission
    const election = await db.election.findFirst({
      where: {
        id: electionIdInt,
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

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election (through organization)
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete voting scopes from elections in your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get count of voting scopes to be soft deleted (exclude already soft-deleted)
    const votingScopesCount = await db.votingScope.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    if (votingScopesCount === 0) {
      return apiResponse({
        success: false,
        message: "No voting scopes found to delete",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Soft delete all voting scopes for this election
    const deletedVotingScopes = await db.votingScope.updateMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
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
      resourceId: electionIdInt,
      message: `Soft deleted ${deletedVotingScopes.count} voting scopes from election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully soft deleted ${deletedVotingScopes.count} voting scopes`,
      data: {
        deletedCount: deletedVotingScopes.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voting scopes deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete voting scopes",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
