import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle POST request for bulk organization operations (superadmin only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const body = await request.json();
    const { operation, organizationIds, organizations: organizationsData } = body;

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
        result = await handleBulkCreate(organizationsData, user, request);
        break;
      case 'DELETE_MULTIPLE':
        result = await handleBulkDelete(organizationIds, user, request);
        break;
      case 'APPROVE_MULTIPLE':
        result = await handleBulkApprove(organizationIds, user, request);
        break;
      case 'REJECT_MULTIPLE':
        result = await handleBulkReject(organizationIds, user, request);
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
    console.error("Bulk organization operation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to perform bulk organization operation",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle bulk creation of organizations
async function handleBulkCreate(organizationsData: any[], user: any, request: NextRequest) {
  if (!organizationsData || !Array.isArray(organizationsData) || organizationsData.length === 0) {
    return apiResponse({
      success: false,
      message: "Organizations data is required for bulk creation",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  const validatedOrganizations = [];
  const errors = [];

  // Validate each organization
  for (let i = 0; i < organizationsData.length; i++) {
    const orgData = organizationsData[i];
    
    // Check if adminId is provided
    if (!orgData.adminId) {
      errors.push({ index: i, error: `Organization ${i + 1}: Admin ID is required` });
      continue;
    }

    // Validate admin exists and has ADMIN role
    const admin = await db.user.findUnique({
      where: { id: orgData.adminId }
    });

    if (!admin || admin.role !== ROLES.ADMIN) {
      errors.push({ index: i, error: `Organization ${i + 1}: Invalid admin ID or user is not an admin` });
      continue;
    }

    // Check if admin already has an organization
    const existingOrg = await db.organization.findUnique({
      where: { adminId: orgData.adminId }
    });

    if (existingOrg && !existingOrg.isDeleted) {
      errors.push({ index: i, error: `Organization ${i + 1}: Admin already has an organization` });
      continue;
    }

    const validation = validateWithZod(organizationSchema, orgData);
    
    if ('data' in validation) {
      validatedOrganizations.push({
        ...validation.data,
        adminId: orgData.adminId,
        membersCount: Number(validation.data.membersCount),
        status: ORGANIZATION_STATUS.PENDING
      });
    } else {
      errors.push({ index: i, error: `Organization ${i + 1} validation failed` });
    }
  }

  if (errors.length > 0) {
    return apiResponse({
      success: false,
      message: "Validation errors found in organizations data",
      data: { errors },
      error: "Bad Request",
      status: 400
    });
  }

  // Check for duplicate names within the batch
  const names = validatedOrganizations.map(org => org.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  
  if (duplicateNames.length > 0) {
    return apiResponse({
      success: false,
      message: "Duplicate organization names found within the batch",
      data: { duplicateNames },
      error: "Bad Request",
      status: 400
    });
  }

  // Check for existing organization names
  const existingOrganizations = await db.organization.findMany({
    where: {
      name: { in: names },
      isDeleted: false
    },
    select: { name: true }
  });

  if (existingOrganizations.length > 0) {
    return apiResponse({
      success: false,
      message: "Some organization names already exist",
      data: { existingNames: existingOrganizations.map(org => org.name) },
      error: "Conflict",
      status: 409
    });
  }

  // Create organizations
  const createdOrganizations = await db.organization.createMany({
    data: validatedOrganizations
  });

  // Fetch the created organizations with their details
  const organizations = await db.organization.findMany({
    where: {
      name: { in: names },
      isDeleted: false
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      }
    }
  });

  const audit = await createAuditLog({
    user,
    action: "CREATE",
    request,
    resource: "ORGANIZATION",
    newData: { createdCount: createdOrganizations.count, organizationNames: names },
    message: `Bulk created ${createdOrganizations.count} organizations`,
  });

  return apiResponse({
    success: true,
    message: `Successfully created ${createdOrganizations.count} organizations`,
    data: {
      createdCount: createdOrganizations.count,
      organizations,
      audit
    },
    error: null,
    status: 201
  });
}

// Handle bulk deletion of organizations
async function handleBulkDelete(organizationIds: number[], user: any, request: NextRequest) {
  if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
    return apiResponse({
      success: false,
      message: "Organization IDs are required for bulk deletion",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  // Validate organization IDs
  const invalidIds = organizationIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({
      success: false,
      message: "Invalid organization IDs provided",
      data: { invalidIds },
      error: "Bad Request",
      status: 400
    });
  }

  // Check if organizations exist and can be deleted
  const organizations = await db.organization.findMany({
    where: {
      id: { in: organizationIds },
      isDeleted: false
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      _count: {
        select: {
          elections: true
        }
      }
    }
  });

  if (organizations.length !== organizationIds.length) {
    const foundIds = organizations.map(org => org.id);
    const notFoundIds = organizationIds.filter(id => !foundIds.includes(id));
    return apiResponse({
      success: false,
      message: "Some organizations not found or already deleted",
      data: { notFoundIds },
      error: "Not Found",
      status: 404
    });
  }

  // Check for organizations with elections
  const orgsWithElections = organizations.filter(org => org._count.elections > 0);
  if (orgsWithElections.length > 0) {
    return apiResponse({
      success: false,
      message: "Cannot delete organizations that have elections",
      data: { 
        organizationsWithElections: orgsWithElections.map(org => ({ 
          id: org.id, 
          name: org.name, 
          electionCount: org._count.elections 
        }))
      },
      error: "Conflict",
      status: 409
    });
  }

  // Soft delete organizations
  const deletedOrgs = await db.organization.updateMany({
    where: {
      id: { in: organizationIds },
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
    resource: "ORGANIZATION",
    deletionType: "SOFT",
    message: `Bulk deleted ${deletedOrgs.count} organizations`,
  });

  return apiResponse({
    success: true,
    message: `Successfully deleted ${deletedOrgs.count} organizations`,
    data: {
      deletedCount: deletedOrgs.count,
      deletedOrganizations: organizations.map(org => ({ id: org.id, name: org.name })),
      audit
    },
    error: null,
    status: 200
  });
}

// Handle bulk approval of organizations
async function handleBulkApprove(organizationIds: number[], user: any, request: NextRequest) {
  if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
    return apiResponse({
      success: false,
      message: "Organization IDs are required for bulk approval",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  return await handleBulkStatusChange(organizationIds, ORGANIZATION_STATUS.APPROVED, "approved", user, request);
}

// Handle bulk rejection of organizations
async function handleBulkReject(organizationIds: number[], user: any, request: NextRequest) {
  if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
    return apiResponse({
      success: false,
      message: "Organization IDs are required for bulk rejection",
      data: null,
      error: "Bad Request",
      status: 400
    });
  }

  return await handleBulkStatusChange(organizationIds, ORGANIZATION_STATUS.REJECTED, "rejected", user, request);
}

// Handle bulk status change (approve/reject)
async function handleBulkStatusChange(organizationIds: number[], newStatus: string, action: string, user: any, request: NextRequest) {
  // Validate organization IDs
  const invalidIds = organizationIds.filter(id => typeof id !== 'number' || isNaN(id) || id <= 0);
  if (invalidIds.length > 0) {
    return apiResponse({
      success: false,
      message: "Invalid organization IDs provided",
      data: { invalidIds },
      error: "Bad Request",
      status: 400
    });
  }

  // Check if organizations exist and are in PENDING status
  const organizations = await db.organization.findMany({
    where: {
      id: { in: organizationIds },
      isDeleted: false
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  if (organizations.length !== organizationIds.length) {
    const foundIds = organizations.map(org => org.id);
    const notFoundIds = organizationIds.filter(id => !foundIds.includes(id));
    return apiResponse({
      success: false,
      message: "Some organizations not found or already deleted",
      data: { notFoundIds },
      error: "Not Found",
      status: 404
    });
  }

  // Check if all organizations are in PENDING status
  const nonPendingOrgs = organizations.filter(org => org.status !== ORGANIZATION_STATUS.PENDING);
  if (nonPendingOrgs.length > 0) {
    return apiResponse({
      success: false,
      message: `Some organizations are not in pending status and cannot be ${action}`,
      data: { 
        nonPendingOrganizations: nonPendingOrgs.map(org => ({ 
          id: org.id, 
          name: org.name, 
          currentStatus: org.status 
        }))
      },
      error: "Bad Request",
      status: 400
    });
  }

  // Update organization statuses
  const updatedOrgs = await db.organization.updateMany({
    where: {
      id: { in: organizationIds },
      isDeleted: false,
      status: ORGANIZATION_STATUS.PENDING
    },
    data: {
      status: newStatus as any
    }
  });

  const audit = await createAuditLog({
    user,
    action: (action === "approved" ? "APPROVE" : "REJECT") as any,
    request,
    resource: "ORGANIZATION",
    message: `Bulk ${action} ${updatedOrgs.count} organizations`,
  });

  return apiResponse({
    success: true,
    message: `Successfully ${action} ${updatedOrgs.count} organizations`,
    data: {
      updatedCount: updatedOrgs.count,
      organizations: organizations.map(org => ({ 
        id: org.id, 
        name: org.name, 
        newStatus: newStatus 
      })),
      audit
    },
    error: null,
    status: 200
  });
}
