// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { partySchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle GET request to fetch parties
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const all = url.searchParams.get('all') === 'true';

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

    // Check permissions - admin can only view parties from their organization's elections
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
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
        message: "You do not have permission to view parties",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get total count for pagination
    const totalCount = await db.party.count({
      where: { 
        electionId: electionIdInt,
        isDeleted: false 
      }
    });

    // Calculate pagination (skip if fetching all)
    const skip = all ? 0 : (page - 1) * limit;
    const take = all ? undefined : limit;

    // Fetch parties for the election
    const parties = await db.party.findMany({
      where: { 
        electionId: electionIdInt,
        isDeleted: false 
      },
      include: all ? {
        // Minimal include for all=true queries to reduce data transfer
        election: {
          select: {
            id: true,
            name: true
          }
        }
      } : {
        // Full include for regular queries
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
            candidates: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      ...(take !== undefined && { take })
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "PARTY",
      resourceId: electionIdInt,
      message: `Viewed parties for election: ${election.name}${all ? ' (all parties)' : ''}`,
    });

    // Calculate pagination info
    const totalPages = all ? 1 : Math.ceil(totalCount / limit);

    // Prepare response data
    const responseData: any = {
      parties,
      audit
    };

    // Only include pagination when not fetching all
    if (!all) {
      responseData.pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } else {
      responseData.totalCount = totalCount;
    }

    return apiResponse({
      success: true,
      message: "Parties fetched successfully",
      data: responseData,
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Parties fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch parties",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new party
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user - only admins can create parties
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse request body
    const body = await request.json();
    const { electionId, ...partyData } = body;

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

    // Validate party data using helper
    const validation = validateWithZod(partySchema, partyData);
    if (!('data' in validation)) return validation;
    const { name, color } = validation.data;

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
        message: "You can only create parties for elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only approved organizations can create parties
    if (election.organization.status !== "APPROVED") {
      return apiResponse({
        success: false,
        message: "You must have an approved organization to create parties",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if party name already exists in this election
    const existingParty = await db.party.findFirst({
      where: {
        electionId: electionIdInt,
        name,
        isDeleted: false
      }
    });

    if (existingParty) {
      return apiResponse({
        success: false,
        message: "A party with this name already exists in this election",
        data: null,
        error: "Already exists",
        status: 400
      });
    }

    // Create a new party in the database
    const party = await db.party.create({
      data: {
        electionId: electionIdInt,
        name,
        color,
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
      resource: "PARTY",
      resourceId: party.id,
      newData: party,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "Party created successfully",
      data: {
        party,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Party creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create party",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all parties of a specific election
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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
        message: "You can only delete parties from elections in your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get count of parties to be deleted
    const partiesCount = await db.party.count({
      where: {
        electionId: electionIdInt,
        isDeleted: false
      }
    });

    if (partiesCount === 0) {
      return apiResponse({
        success: false,
        message: "No parties found to delete",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Soft delete all parties for this election
    const deletedParties = await db.party.updateMany({
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
      resource: "PARTY",
      resourceId: electionIdInt,
      deletionType: "SOFT",
      message: `Deleted ${deletedParties.count} parties from election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedParties.count} parties`,
      data: {
        deletedCount: deletedParties.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Parties deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete parties",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
