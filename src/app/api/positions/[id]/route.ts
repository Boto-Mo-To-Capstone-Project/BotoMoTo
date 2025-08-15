import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { positionUpdateSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch a specific position
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
        message: "You must be logged in to view this position",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const positionId = parseInt(params.id);
    if (isNaN(positionId)) {
      return apiResponse({
        success: false,
        message: "Invalid position ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch position with related data
    const position = await db.position.findUnique({
      where: {
        id: positionId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            status: true,
            organization: {
              select: {
                id: true,
                name: true,
                adminId: true,
                status: true
              }
            }
          }
        },
        votingScope: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        candidates: {
          where: {
            isDeleted: false
          },
          select: {
            id: true,
            voter: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true
              }
            },
            party: {
              select: {
                id: true,
                name: true,
                color: true,
                logoUrl: true
              }
            },
            imageUrl: true,
            bio: true,
            isNew: true
          }
        },
        _count: {
          select: {
            candidates: true,
            voteResponses: true
          }
        }
      }
    });

    if (!position) {
      return apiResponse({
        success: false,
        message: "Position not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions - admin can only view positions from their organization's elections
    if (user.role === ROLES.ADMIN && position.election.organization.adminId !== user.id) {
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
        message: "You do not have permission to view position details",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "POSITION",
      resourceId: position.id,
      message: `Viewed position: ${position.name}`,
    });

    return apiResponse({
      success: true,
      message: "Position fetched successfully",
      data: {
        position,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Position fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch position",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific position
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
        message: "You must be logged in to update positions",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update positions",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const positionId = parseInt(params.id);
    if (isNaN(positionId)) {
      return apiResponse({
        success: false,
        message: "Invalid position ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate position data using helper
    const validation = validateWithZod(positionUpdateSchema, body);
    if (!('data' in validation)) return validation;

    const { name, description, voteLimit, numOfWinners, votingScopeId, order } = validation.data;

    // Check if position exists
    const existingPosition = await db.position.findUnique({
      where: {
        id: positionId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            status: true,
            organization: {
              select: {
                id: true,
                adminId: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!existingPosition) {
      return apiResponse({
        success: false,
        message: "Position not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this position (through election organization)
    if (user.role === ROLES.ADMIN && existingPosition.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only approved organizations can update positions
    if (existingPosition.election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Only approved organizations can update positions",
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

      if (votingScope.electionId !== existingPosition.electionId) {
        return apiResponse({
          success: false,
          message: "Voting scope must belong to the same election",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Check if position name already exists in this election (excluding current position)
    if (name !== existingPosition.name) {
      const duplicatePosition = await db.position.findFirst({
        where: {
          electionId: existingPosition.electionId,
          name,
          isDeleted: false,
          NOT: {
            id: positionId
          }
        }
      });

      if (duplicatePosition) {
        return apiResponse({
          success: false,
          message: "A position with this name already exists in this election",
          data: null,
          error: "Conflict",
          status: 409
        });
      }
    }

    // Store old data for comparison
    const oldData = {
      name: existingPosition.name,
      voteLimit: existingPosition.voteLimit,
      numOfWinners: existingPosition.numOfWinners,
      votingScopeId: existingPosition.votingScopeId,
      order: existingPosition.order
    };

    // Update the position
    const position = await db.position.update({
      where: { id: positionId },
      data: {
        name,
        voteLimit,
        numOfWinners,
        votingScopeId,
        order,
        updatedAt: new Date()
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
      }
    });

    // Calculate changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    const newData = { name, description, voteLimit, numOfWinners, votingScopeId, order };
    Object.keys(newData).forEach(key => {
      if (oldData[key as keyof typeof oldData] !== newData[key as keyof typeof newData]) {
        changedFields[key] = { old: oldData[key as keyof typeof oldData], new: newData[key as keyof typeof newData] };
      }
    });

    // Log update audit
    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "POSITION",
      resourceId: position.id,
      changedFields,
      message: `Updated position: ${position.name}`,
    });

    return apiResponse({
      success: true,
      message: "Position updated successfully",
      data: {
        position,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Position update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update position",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete a specific position
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

    const positionId = parseInt(params.id);
    if (isNaN(positionId)) {
      return apiResponse({
        success: false,
        message: "Invalid position ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if position exists
    const position = await db.position.findUnique({
      where: {
        id: positionId,
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
                adminId: true
              }
            }
          }
        },
        _count: {
          select: {
            candidates: true,
            voteResponses: true
          }
        }
      }
    });

    if (!position) {
      return apiResponse({
        success: false,
        message: "Position not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this position (through election organization)
    if (user.role === ROLES.ADMIN && position.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if position has candidates or votes
    if (position._count.candidates > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete position that has candidates. Please remove all candidates first.",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    if (position._count.voteResponses > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete position that has votes",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Soft delete the position
    const deletedPosition = await db.position.update({
      where: { id: positionId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      }
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "POSITION",
      resourceId: position.id,
      deletionType: "SOFT",
      message: `Deleted position: ${position.name}`,
    });

    return apiResponse({
      success: true,
      message: "Position deleted successfully",
      data: {
        deletedPosition: {
          id: deletedPosition.id,
          name: position.name
        },
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Position deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete position",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
