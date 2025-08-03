// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch all elections (superadmin only)
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view elections",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only superadmin can view all elections
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only superadmin can view all elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const elections = await db.election.findMany({
      where: { isDeleted: false },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: {
            voters: {
              where: { isDeleted: false }
            },
            candidates: {
              where: { isDeleted: false }
            },
            positions: {
              where: { isDeleted: false }
            },
            parties: {
              where: { isDeleted: false }
            },
            voteResponses: true
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
      message: "Viewed all elections (superadmin)",
    });

    return apiResponse({
      success: true,
      message: "Elections fetched successfully",
      data: {
        elections,
        totalCount: elections.length,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get elections error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch elections",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new election (admin only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create an election",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only admin users can create elections (superadmin should not have associated elections)
    if (user.role !== ROLES.ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get user's organization and verify it's approved
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

    if (organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Only approved organizations can create elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateWithZod(electionSchema, body);
    if (!('data' in validation)) return validation;
    
    const { name, description, status, isLive, allowSurvey } = validation.data;

    // Check if election name already exists in this organization
    const nameExists = await db.election.findFirst({
      where: {
        orgId: organization.id,
        name,
        isDeleted: false
      }
    });

    if (nameExists) {
      return apiResponse({
        success: false,
        message: "Election name already exists in your organization",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Create a new election
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
            email: true,
            status: true
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
    });

    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      newData: election,
      message: `Created new election: ${election.name}`,
    });

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


