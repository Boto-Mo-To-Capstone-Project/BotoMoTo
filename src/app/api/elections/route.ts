// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch elections
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Fetch elections for super admin (can view all elections)
    if (user.role === ROLES.SUPER_ADMIN) {
      const elections = await db.election.findMany({
        where: { isDeleted: false }, // Only non-deleted elections
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
              parties: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "ELECTION",
        message: "Viewed all elections (super admin)",
      });

      return apiResponse({
        success: true,
        message: "Elections fetched successfully",
        data: {
          elections,
          audit
        },
        error: null,
        status: 200
      });
    }

    // Fetch elections for admin (only their organization's elections)
    if (user.role === ROLES.ADMIN) {
      // First check if user has an organization
      const organization = await db.organization.findUnique({
        where: { 
          adminId: user.id,
          isDeleted: false 
        },
      });

      if (!organization) {
        return apiResponse({ 
          success: false, 
          message: "Organization not found. Please create an organization first.", 
          data: null, 
          error: "Not Found", 
          status: 404 
        });
      }

      const elections = await db.election.findMany({
        where: { 
          orgId: organization.id,
          isDeleted: false 
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
          _count: {
            select: {
              voters: true,
              candidates: true,
              positions: true,
              parties: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "ELECTION",
        resourceId: organization.id,
        message: "Viewed organization elections (admin)",
      });

      return apiResponse({
        success: true,
        message: "Elections fetched successfully",
        data: {
          elections,
          audit
        },
        error: null,
        status: 200
      });
    }

    // Deny access for other roles
    return apiResponse({
      success: false,
      message: "You do not have permission to view elections",
      data: null,
      error: "Forbidden",
      status: 403
    });
  } catch (error) {
    console.error("Elections fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch elections",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new election
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create an election",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role (only admins can create elections)
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get user's organization
    const organization = await db.organization.findUnique({
      where: { 
        adminId: user.id,
        isDeleted: false,
        status: "APPROVED" // Only approved organizations can create elections
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "You must have an approved organization to create elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate election data using helper
    const validation = validateWithZod(electionSchema, body);
    if (!('data' in validation)) return validation;
    const { name, description, status, isLive, allowSurvey } = validation.data;

    // Create a new election in the database
    const election = await db.election.create({
      data: {
        orgId: organization.id,
        name,
        description,
        status: status || ELECTION_STATUS.DRAFT,
        isLive: isLive || false,
        allowSurvey: allowSurvey || false,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
      },
    });

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      newData: election,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "Election created successfully",
      data: {
        election,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Election creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all elections of the admin's organization
export async function DELETE(request: NextRequest) {
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

    // Get user's organization
    const organization = await db.organization.findUnique({
      where: { 
        adminId: user.id,
        isDeleted: false 
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Get count of elections to be deleted
    const electionsCount = await db.election.count({
      where: {
        orgId: organization.id,
        isDeleted: false
      }
    });

    if (electionsCount === 0) {
      return apiResponse({
        success: false,
        message: "No elections found to delete",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Soft delete all elections for this organization
    const deletedElections = await db.election.updateMany({
      where: {
        orgId: organization.id,
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
      resource: "ELECTION",
      resourceId: organization.id,
      deletionType: "SOFT",
      message: `Deleted ${deletedElections.count} elections`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedElections.count} elections`,
      data: {
        deletedCount: deletedElections.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Elections deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete elections",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
