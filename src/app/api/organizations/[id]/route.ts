import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request for specific organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view organization details",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const { id } = await params;
    const organizationId = parseInt(id);
    
    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const organization = await db.organization.findUnique({
      where: { 
        id: organizationId,
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
        },
        elections: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            elections: true
          }
        }
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Admin can only get their own organization, superadmin can get others
    if (user.role === ROLES.ADMIN && organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view your own organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only admin and superadmin can access this endpoint
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view organization details",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ORGANIZATION",
      resourceId: organization.id,
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Viewed organization details (superadmin)"
        : "Viewed own organization details (admin)",
    });

    return apiResponse({
      success: true,
      message: "Organization details fetched successfully",
      data: {
        organization,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch organization details",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update specific organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to update an organization",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const { id } = await params;
    const organizationId = parseInt(id);
    
    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateWithZod(organizationSchema, body);
    if (!('data' in validation)) return validation;
    
    const { name, email, membersCount, photoUrl, letterUrl } = validation.data;

    const organization = await db.organization.findUnique({
      where: { 
        id: organizationId,
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
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Admin can only update their own organization, superadmin can edit others
    if (user.role === ROLES.ADMIN && organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update your own organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only admin and superadmin can access this endpoint
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to update organizations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if organization name already exists (excluding current org)
    const nameExists = await db.organization.findFirst({
      where: {
        name,
        isDeleted: false,
        NOT: {
          id: organizationId
        }
      }
    });

    if (nameExists) {
      return apiResponse({
        success: false,
        message: "Organization name already exists",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Store old data for audit comparison
    const oldData = {
      name: organization.name,
      email: organization.email,
      membersCount: organization.membersCount,
      photoUrl: organization.photoUrl,
      letterUrl: organization.letterUrl
    };

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: {
        name,
        email,
        membersCount: Number(membersCount),
        photoUrl,
        letterUrl,
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
      },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "email", "membersCount", "photoUrl", "letterUrl"] as const) {
      if (oldData[key] !== updatedOrg[key]) {
        changedFields[key] = { old: oldData[key], new: updatedOrg[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ORGANIZATION",
      resourceId: updatedOrg.id,
      changedFields,
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Updated organization (superadmin)"
        : "Updated own organization (admin)",
    });

    return apiResponse({
      success: true,
      message: "Organization updated successfully",
      data: {
        organization: updatedOrg,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Organization update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update organization",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to soft-delete specific organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to delete an organization",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const { id } = await params;
    const organizationId = parseInt(id);
    
    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const organization = await db.organization.findUnique({
      where: { 
        id: organizationId,
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
        },
        _count: {
          select: {
            elections: true
          }
        }
      },
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Admin can only delete their own organization, superadmin can delete others
    if (user.role === ROLES.ADMIN && organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete your own organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Only admin and superadmin can access this endpoint
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "You do not have permission to delete organizations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if organization has elections
    if (organization._count.elections > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete organization that has elections",
        data: { 
          electionCount: organization._count.elections 
        },
        error: "Conflict",
        status: 409
      });
    }

    // Soft delete organization
    const deletedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
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
      action: "DELETE",
      request,
      resource: "ORGANIZATION",
      resourceId: deletedOrg.id,
      deletionType: "SOFT",
      message: user.role === ROLES.SUPER_ADMIN 
        ? "Deleted organization (superadmin)"
        : "Deleted own organization (admin)",
    });

    return apiResponse({
      success: true,
      message: "Organization deleted successfully",
      data: {
        organization: deletedOrg,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Organization deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete organization",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
