// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Handle GET request to fetch elections (filtered by role)
async function getElections(request: NextRequest) {
  try {
    // Authenticate the user - allow both admin and superadmin
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get pagination parameters from query
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const all = url.searchParams.get('all') === 'true';

    let elections;
    let message;
    let totalCount;

    if (user.role === ROLES.SUPER_ADMIN) {
      // Super admin can see all elections
      const where = { isDeleted: false };
      
      // Get total count for pagination
      totalCount = await db.election.count({ where });

      // Calculate pagination (skip if fetching all)
      const skip = all ? 0 : (page - 1) * limit;
      const take = all ? undefined : limit;

      elections = await db.election.findMany({
        where,
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
          template: { // Include template info for instances
            select: {
              id: true,
              name: true,
              isTemplate: true
            }
          },
          _count: {
            select: {
              voters: { where: { isDeleted: false } },
              candidates: { where: { isDeleted: false } },
              positions: { where: { isDeleted: false } },
              parties: { where: { isDeleted: false } },
              voteResponses: true,
              instances: true // Count instances for templates
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(take !== undefined && { take })
      });
      message = `All elections fetched successfully (superadmin)${all ? ' (all elections)' : ''}`;
    } else {
      // Admin can only see elections from their own organization
      const where = {
        isDeleted: false,
        organization: { adminId: user.id },
      };

      // Get total count for pagination
      totalCount = await db.election.count({ where });

      // Calculate pagination (skip if fetching all)
      const skip = all ? 0 : (page - 1) * limit;
      const take = all ? undefined : limit;

      elections = await db.election.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            }
          },
          schedule: true,
          mfaSettings: true,
          template: { // Include template info for instances
            select: {
              id: true,
              name: true,
              isTemplate: true
            }
          },
          _count: {
            select: {
              voters: { where: { isDeleted: false } },
              candidates: { where: { isDeleted: false } },
              positions: { where: { isDeleted: false } },
              parties: { where: { isDeleted: false } },
              voteResponses: true,
              instances: true // Count instances for templates
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        ...(take !== undefined && { take })
      });
      message = `Your elections fetched successfully (admin)${all ? ' (all elections)' : ''}`;
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      message: user.role === ROLES.SUPER_ADMIN
        ? "Viewed all elections (superadmin)"
        : "Viewed own elections (admin)",
    });

    // Calculate pagination info
    const totalPages = all ? 1 : Math.ceil(totalCount / limit);

    // Prepare response data
    const responseData: any = {
      elections,
      audit
    };

    // Only include pagination when not fetching all
    if (!all) {
      responseData.pagination = {
        currentPage: page,
        pageSize: limit,
        totalCount,
        totalPages
      };
    } else {
      responseData.totalCount = totalCount;
    }

    return apiResponse({
      success: true,
      message,
      data: responseData,
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
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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

    // Parse request body
    const rawBody = await request.json();

    // Validate core election fields using schema
    const validation = validateWithZod(electionSchema, rawBody);
    if (!("data" in validation)) return validation;

    const { 
      name, 
      description, 
      status, 
      isTemplate, 
      templateId, 
      instanceYear, 
      instanceName 
    } = validation.data;

    // Validate template/instance logic
    if (isTemplate && templateId) {
      return apiResponse({
        success: false,
        message: 'Templates cannot have a parent template',
        error: 'Bad Request',
        status: 400,
      });
    }

    // For templates (repeating elections), require instance details
    if (isTemplate && (!instanceYear || !instanceName)) {
      return apiResponse({
        success: false,
        message: 'instanceYear and instanceName are required for repeating elections',
        error: 'Bad Request',
        status: 400,
      });
    }

    if (!isTemplate && templateId) {
      // This is an instance - require year and name
      if (!instanceYear || !instanceName) {
        return apiResponse({
          success: false,
          message: 'instanceYear and instanceName are required for election instances',
          error: 'Bad Request',
          status: 400,
        });
      }

      // Verify template exists and belongs to this organization
      const template = await db.election.findUnique({
        where: { 
          id: templateId,
          isDeleted: false,
          isTemplate: true,
          orgId: organization.id
        }
      });

      if (!template) {
        return apiResponse({
          success: false,
          message: 'Template not found or does not belong to your organization',
          error: 'Not Found',
          status: 404,
        });
      }
    }

    // Extract optional schedule fields (support multiple shapes)
    const rawStart = rawBody?.schedule?.dateStart ?? rawBody?.schedule?.startDate ?? rawBody?.startDate ?? null;
    const rawEnd = rawBody?.schedule?.dateFinish ?? rawBody?.schedule?.endDate ?? rawBody?.endDate ?? null;

    // Validate schedule if provided
    let dateStart: Date | undefined;
    let dateFinish: Date | undefined;
    if ((rawStart && !rawEnd) || (!rawStart && rawEnd)) {
      return apiResponse({
        success: false,
        message: 'Both startDate and endDate are required when setting a schedule',
        error: 'Bad Request',
        status: 400,
      });
    }
    if (rawStart && rawEnd) {
      const start = new Date(rawStart);
      const end = new Date(rawEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return apiResponse({
          success: false,
          message: 'Invalid date format for schedule. Use ISO strings.',
          error: 'Bad Request',
          status: 400,
        });
      }
      if (start >= end) {
        return apiResponse({
          success: false,
          message: 'Schedule startDate must be earlier than endDate',
          error: 'Bad Request',
          status: 400,
        });
      }
      dateStart = start;
      dateFinish = end;
    }

    // Check if election name already exists in this organization
    // Handle different conflict scenarios based on election type
    let nameConflictQuery: any;
    let conflictMessage: string;

    if (isTemplate && !templateId) {
      // This is a template - only check for other templates with same name
      // Instances with same name are allowed (they inherit from template)
      nameConflictQuery = {
        orgId: organization.id,
        name,
        isDeleted: false,
        isTemplate: true,
        templateId: null
      };
      conflictMessage = "A template with this name already exists in this organization";
    } else if (!isTemplate && templateId) {
      // This is an instance - check for duplicate instances with same template, year, and name
      nameConflictQuery = {
        orgId: organization.id,
        templateId: templateId,
        instanceYear: instanceYear,
        instanceName: instanceName,
        isDeleted: false
      };
      conflictMessage = "An instance with this year and name already exists for this template";
    } else {
      // This is a standalone - check for any election with same name (standalone or template)
      nameConflictQuery = {
        orgId: organization.id,
        name,
        isDeleted: false,
        OR: [
          { isTemplate: true, templateId: null }, // Other templates
          { isTemplate: false, templateId: null } // Other standalone elections
        ]
      };
      conflictMessage = "Election name already exists in this organization";
    }

    const nameExists = await db.election.findFirst({
      where: nameConflictQuery
    });

    if (nameExists) {
      return apiResponse({
        success: false,
        message: conflictMessage,
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
        isTemplate: isTemplate || false,
        templateId: templateId || null,
        instanceYear: instanceYear || null,
        instanceName: instanceName || null,
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

    // Create schedule if provided
    if (dateStart && dateFinish) {
      await db.electionSched.upsert({
        where: { electionId: election.id },
        create: { electionId: election.id, dateStart, dateFinish },
        update: { dateStart, dateFinish },
      });
    }

    // Re-fetch with schedule to ensure it's included
    const electionWithSchedule = await db.election.findUnique({
      where: { id: election.id },
      include: {
        organization: {
          select: { id: true, name: true, email: true, status: true }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: { voters: true, candidates: true, positions: true, parties: true }
        }
      }
    });

    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      newData: (electionWithSchedule as any) ?? (election as any),
      message: `Created new election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: 'Election created successfully',
      data: {
        election: electionWithSchedule,
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
✅ GET /api/elections - Election listing performance (admin + superadmin dashboards)
✅ POST /api/elections - Election creation speed

Key metrics for election management:
- Election listing speed for admin dashboards
- Election creation performance 
- Peak usage during election setup periods
- System performance during heavy election activity
*/


