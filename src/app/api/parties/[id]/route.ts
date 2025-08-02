// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { partySchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch a specific party
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
        message: "You must be logged in to view this party",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const partyId = parseInt(params.id);
    if (isNaN(partyId)) {
      return apiResponse({
        success: false,
        message: "Invalid party ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch party with election and organization info
    const party = await db.party.findUnique({
      where: {
        id: partyId,
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
            candidates: true
          }
        }
      },
    });

    if (!party) {
      return apiResponse({
        success: false,
        message: "Party not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions
    if (user.role === ROLES.ADMIN && party.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view parties from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Deny access for voters
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view this party",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "PARTY",
      resourceId: party.id,
      message: `Viewed party: ${party.name}`,
    });

    return apiResponse({
      success: true,
      message: "Party fetched successfully",
      data: {
        party,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Party fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch party",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific party
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
        message: "You must be logged in to update parties",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update parties",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const partyId = parseInt(params.id);
    if (isNaN(partyId)) {
      return apiResponse({
        success: false,
        message: "Invalid party ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(partySchema, body);
    if (!('data' in validation)) return validation;
    const { name, color, logoUrl, description } = validation.data;

    // Fetch existing party
    const existingParty = await db.party.findUnique({
      where: {
        id: partyId,
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
        }
      }
    });

    if (!existingParty) {
      return apiResponse({
        success: false,
        message: "Party not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this party (through organization)
    if (user.role === ROLES.ADMIN && existingParty.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update parties from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if party name already exists in this election (excluding current party)
    if (name !== existingParty.name) {
      const nameExists = await db.party.findFirst({
        where: {
          electionId: existingParty.electionId,
          name,
          isDeleted: false,
          id: { not: partyId }
        }
      });

      if (nameExists) {
        return apiResponse({
          success: false,
          message: "A party with this name already exists in this election",
          data: null,
          error: "Already exists",
          status: 400
        });
      }
    }

    // Update party
    const updatedParty = await db.party.update({
      where: { id: partyId },
      data: { 
        name, 
        color, 
        logoUrl, 
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
    for (const key of ["name", "color", "logoUrl", "description"] as const) {
      if (existingParty[key] !== updatedParty[key]) {
        changedFields[key] = { old: existingParty[key], new: updatedParty[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "PARTY",
      resourceId: updatedParty.id,
      changedFields,
    });

    return apiResponse({
      success: true,
      message: "Party updated successfully",
      data: {
        party: updatedParty,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Party update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update party",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to soft-delete a specific party
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
        message: "You must be logged in to delete parties",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete parties",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const partyId = parseInt(params.id);
    if (isNaN(partyId)) {
      return apiResponse({
        success: false,
        message: "Invalid party ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch existing party
    const existingParty = await db.party.findUnique({
      where: {
        id: partyId,
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
        }
      }
    });

    if (!existingParty) {
      return apiResponse({
        success: false,
        message: "Party not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this party (through organization)
    if (user.role === ROLES.ADMIN && existingParty.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete parties from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Soft delete party
    const deletedParty = await db.party.update({
      where: { id: partyId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "PARTY",
      resourceId: deletedParty.id,
      deletionType: "SOFT",
      message: `Deleted party: ${existingParty.name}`,
    });

    return apiResponse({
      success: true,
      message: "Party deleted successfully",
      data: {
        party: deletedParty,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Party deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete party",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
