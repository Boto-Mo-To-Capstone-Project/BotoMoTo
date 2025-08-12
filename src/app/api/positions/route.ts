import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { positionSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

// Handle GET request to fetch positions
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view positions",
        data: null,
        error: "Unauthorized",
        status: 401
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
    const election = await db.election.findUnique({
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

    // Check permissions - admin can only view positions from their organization's elections
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Deny access for voters
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Fetch positions for the election (exclude soft-deleted)
    const positions = await db.position.findMany({
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
        votingScope: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            candidates: true
          }
        }
      },
      orderBy: [
        { order: "asc" },
        { id: "asc" }
      ],
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "POSITION",
      resourceId: electionIdInt,
      message: `Viewed positions for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Positions fetched successfully",
      data: {
        positions,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Positions fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch positions",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new position
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create positions",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role (only admins can create positions)
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate position data using helper
    const validation = validateWithZod(positionSchema, body);
    if (!('data' in validation)) return validation;

    const { electionId, name, description, voteLimit, numOfWinners, votingScopeId, order } = validation.data;

    // Check if election exists and user has permission
    const election = await db.election.findUnique({
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
        message: "You can only create positions for your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only approved organizations can create positions
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Only approved organizations can create positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // If votingScopeId is provided, validate it exists and belongs to the same election
    if (votingScopeId) {
      const votingScope = await db.votingScope.findUnique({
        where: {
          id: votingScopeId,
          isDeleted: false
        },
        select: {
          id: true,
          electionId: true
        }
      });

      if (!votingScope) {
        return apiResponse({
          success: false,
          message: "Voting scope not found or has been deleted",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      if (votingScope.electionId !== electionId) {
        return apiResponse({
          success: false,
          message: "Voting scope must belong to the same election",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Check if position name already exists in this election (exclude soft-deleted)
    const existingPosition = await db.position.findFirst({
      where: {
        electionId: electionId,
        name,
        isDeleted: false
      }
    });

    if (existingPosition) {
      return apiResponse({
        success: false,
        message: "A position with this name already exists in this election",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Create a new position in the database
    const position = await db.position.create({
      data: {
        electionId,
        name,
        description,
        voteLimit,
        numOfWinners,
        votingScopeId,
        order
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
        votingScope: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            candidates: true
          }
        }
      },
    });

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "POSITION",
      resourceId: position.id,
      newData: position,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "Position created successfully",
      data: {
        position,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Position creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create position",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all positions of a specific election
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to delete positions",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete positions",
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
    const election = await db.election.findUnique({
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
        message: "You can only delete positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get count of positions to be deleted
    const positionsCount = await db.position.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    if (positionsCount === 0) {
      return apiResponse({
        success: false,
        message: "No positions found to delete for this election",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Soft delete all positions for this election
    const deletedPositions = await db.position.updateMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "POSITION",
      resourceId: electionIdInt,
      deletionType: "SOFT",
      message: `Deleted ${deletedPositions.count} positions for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedPositions.count} positions`,
      data: {
        deletedCount: deletedPositions.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Positions deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete positions",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
