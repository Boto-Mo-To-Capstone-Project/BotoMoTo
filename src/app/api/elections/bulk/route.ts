import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";

// Handle POST request for bulk election operations
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to perform bulk election operations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only admin and superadmin can perform bulk operations
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin and superadmin can perform bulk election operations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const body = await request.json();
    const { operation, electionIds, elections: electionsData } = body;

    // Validate required fields
    if (!operation) {
      return apiResponse({
        success: false,
        message: "Operation type is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    let result;

    switch (operation) {
      case 'CREATE_MULTIPLE':
        result = await handleBulkCreate(electionsData, user, request);
        break;
      case 'DELETE_MULTIPLE':
        result = await handleBulkDelete(electionIds, user, request);
        break;
      default:
        return apiResponse({
          success: false,
          message: "Unsupported bulk operation",
          data: null,
          error: "Bad Request",
          status: 400
        });
    }

    return result;

  } catch (error) {
    console.error("Bulk election operation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to perform bulk election operation",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request for bulk deletion (admin can bulk delete their own elections)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to perform bulk operations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only admin and superadmin can perform bulk delete
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin and superadmin can perform bulk delete operations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const body = await request.json();
    const { electionIds } = body;

    return await handleBulkDelete(electionIds, user, request);

  } catch (error) {
    console.error("Bulk election deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to perform bulk deletion",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle bulk creation of elections
async function handleBulkCreate(electionsData: any[], user: any, request: NextRequest) {
  if (!electionsData || !Array.isArray(electionsData) || electionsData.length === 0) {
    return apiResponse({
      success: false,
      message: "Elections data is required for bulk creation",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  // For admin users, they can only create elections for their organization
  let organizationId: number | undefined;
  if (user.role === ROLES.ADMIN) {
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

    organizationId = organization.id;
  }

  const validatedElections = [];
  const errors = [];

  // Validate each election
  for (let i = 0; i < electionsData.length; i++) {
    const electionData = electionsData[i];
    
    // For superadmin, orgId must be provided in the data
    if (user.role === ROLES.SUPER_ADMIN) {
      if (!electionData.orgId) {
        errors.push({ index: i, error: `Election ${i + 1}: Organization ID is required for superadmin bulk creation` });
        continue;
      }

      // Validate organization exists and is approved
      const org = await db.organization.findUnique({
        where: { 
          id: electionData.orgId,
          isDeleted: false 
        }
      });

      if (!org || org.status !== ORGANIZATION_STATUS.APPROVED) {
        errors.push({ index: i, error: `Election ${i + 1}: Invalid or non-approved organization` });
        continue;
      }
    } else {
      // For admin, use their organization
      if (organizationId) {
        electionData.orgId = organizationId;
      }
    }

    const validation = validateWithZod(electionSchema, electionData);
    
    if ('data' in validation) {
      validatedElections.push({
        ...validation.data,
        orgId: electionData.orgId,
        status: validation.data.status || ELECTION_STATUS.DRAFT,
        allowSurvey: validation.data.allowSurvey || false
      });
    } else {
      errors.push({ index: i, error: `Election ${i + 1} validation failed` });
    }
  }

  if (errors.length > 0) {
    return apiResponse({
      success: false,
      message: "Validation errors found in elections data",
      data: { errors },
      error: "Bad Request",
      status: 400
    });
  }

  // Check for duplicate names within each organization
  const orgElections = new Map<number, string[]>();
  for (const election of validatedElections) {
    if (!orgElections.has(election.orgId)) {
      orgElections.set(election.orgId, []);
    }
    orgElections.get(election.orgId)!.push(election.name);
  }

  // Check for duplicates within each organization
  for (const [orgId, names] of orgElections) {
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      return apiResponse({
        success: false,
        message: `Duplicate election names found within organization ${orgId}`,
        data: { duplicateNames, organizationId: orgId },
        error: "Bad Request",
        status: 400
      });
    }

    // Check for existing election names in each organization
    const existingElections = await db.election.findMany({
      where: {
        orgId,
        name: { in: names },
        isDeleted: false
      },
      select: { name: true }
    });

    if (existingElections.length > 0) {
      return apiResponse({
        success: false,
        message: `Some election names already exist in organization ${orgId}`,
        data: { 
          existingNames: existingElections.map(e => e.name),
          organizationId: orgId 
        },
        error: "Conflict",
        status: 409
      });
    }
  }

  // Create elections
  const createdElections = await db.election.createMany({
    data: validatedElections
  });

  // Fetch the created elections with their details
  const allNames = validatedElections.map(e => e.name);
  const elections = await db.election.findMany({
    where: {
      name: { in: allNames },
      isDeleted: false
    },
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
    }
  });

  const audit = await createAuditLog({
    user,
    action: "CREATE",
    request,
    resource: "ELECTION",
    newData: { createdCount: createdElections.count, electionNames: allNames },
    message: `Bulk created ${createdElections.count} elections`,
  });

  return apiResponse({
    success: true,
    message: `Successfully created ${createdElections.count} elections`,
    data: {
      createdCount: createdElections.count,
      elections,
      audit
    },
    error: null,
    status: 201
  });
}

// Handle bulk deletion of elections
async function handleBulkDelete(electionIds: number[], user: any, request: NextRequest) {
  if (!electionIds || !Array.isArray(electionIds) || electionIds.length === 0) {
    return apiResponse({
      success: false,
      message: "Election IDs are required for bulk deletion",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  // Validate election IDs
  const invalidIds = electionIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({
      success: false,
      message: "Invalid election IDs provided",
      data: { invalidIds },
      error: "Bad Request",
      status: 400
    });
  }

  // Check if elections exist and user has access
  let whereClause: any = {
    id: { in: electionIds },
    isDeleted: false
  };

  // For admin users, they can only delete elections from their organization
  if (user.role === ROLES.ADMIN) {
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

    whereClause.orgId = organization.id;
  }

  const elections = await db.election.findMany({
    where: whereClause,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          admin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          voteResponses: true
        }
      }
    }
  });

  if (elections.length !== electionIds.length) {
    const foundIds = elections.map(e => e.id);
    const notFoundIds = electionIds.filter(id => !foundIds.includes(id));
    return apiResponse({
      success: false,
      message: user.role === ROLES.ADMIN 
        ? "Some elections not found or don't belong to your organization"
        : "Some elections not found or already deleted",
      data: { notFoundIds },
      error: "Not Found",
      status: 404
    });
  }

  // Check for elections with votes
  const electionsWithVotes = elections.filter(e => e._count.voteResponses > 0);
  if (electionsWithVotes.length > 0) {
    return apiResponse({
      success: false,
      message: "Cannot delete elections that have votes",
      data: { 
        electionsWithVotes: electionsWithVotes.map(e => ({ 
          id: e.id, 
          name: e.name, 
          voteCount: e._count.voteResponses 
        }))
      },
      error: "Conflict",
      status: 409
    });
  }

  // Soft delete elections
  const deletedElections = await db.election.updateMany({
    where: {
      id: { in: electionIds },
      isDeleted: false,
      ...(user.role === ROLES.ADMIN ? { orgId: whereClause.orgId } : {})
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
    resource: "ELECTION",
    deletionType: "SOFT",
    message: `Bulk deleted ${deletedElections.count} elections`,
  });

  return apiResponse({
    success: true,
    message: `Successfully deleted ${deletedElections.count} elections`,
    data: {
      deletedCount: deletedElections.count,
      deletedElections: elections.map(e => ({ id: e.id, name: e.name })),
      audit
    },
    error: null,
    status: 200
  });
}
