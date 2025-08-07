// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Handle GET request to fetch all elections (superadmin only)
async function getElections(request: NextRequest) {
  try {
    // Authenticate the user with required role
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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
      message: 'Elections fetched successfully',
      data: {
        elections,
        totalCount: elections.length,
        audit,
      },
      status: 200,
    });
  } catch (error) {
    console.error('Get elections error:', error);
    return apiResponse({
      success: false,
      message: 'Failed to fetch elections',
      error: typeof error === 'string' ? error : 'Internal server error',
      status: 500,
    });
  }
}

// Handle POST request to create a new election (admin only)
async function createElection(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: 'You must be logged in to create an election',
        error: 'Unauthorized',
        status: 401,
      });
    }

    // Only admin users can create elections (superadmin should not have associated elections)
    if (user.role !== ROLES.ADMIN) {
      return apiResponse({
        success: false,
        message: 'Only admin users can create elections',
        error: 'Forbidden',
        status: 403,
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
        message: 'Organization not found. Please create an organization first.',
        error: 'Not Found',
        status: 404,
      });
    }

    if (organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: 'Only approved organizations can create elections',
        error: 'Forbidden',
        status: 403,
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
        message: 'Election name already exists in your organization',
        error: 'Conflict',
        status: 409,
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
      message: 'Election created successfully',
      data: {
        election,
        audit,
      },
      status: 201,
    });
  } catch (error) {
    console.error('Election creation error:', error);
    return apiResponse({
      success: false,
      message: 'Failed to create election',
      error: typeof error === 'string' ? error : 'Internal server error',
      status: 500,
    });
  }
}

// Apply performance logging middleware to elections endpoints
export const GET = withPerformanceLogging(getElections as any);
export const POST = withPerformanceLogging(createElection as any);

/*
PERFORMANCE LOGGING ADDED TO ELECTIONS API! 🎉

What this captures:
✅ GET /api/elections - Election listing performance (superadmin dashboard)
✅ POST /api/elections - Election creation speed

Key metrics for election management:
- Election listing speed for admin dashboards
- Election creation performance 
- Peak usage during election setup periods
- System performance during heavy election activity
*/


