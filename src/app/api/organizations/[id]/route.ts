import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { checkOwnership } from "@/lib/helpers/checkOwnership";
import { findOrganizationById } from "@/lib/helpers/findOrganizationById";  

// Handle GET request for specific organization (admin and superadmin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Admin can only view their own organization, superadmin can view any
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
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
      data: organization,
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
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Admin can only update their own organization, superadmin can edit others
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
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
      }
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
      data: updatedOrg,
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
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

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

    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Admin can only delete their own organization, superadmin can delete others
    const isOwner = checkOwnership(user, organization.adminId);
    if (!isOwner.allowed) {
      return isOwner.response;
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

    return apiResponse({ success: true, message: "Organization deleted successfully", data: deletedOrg, error: null, status: 200 });
  } catch (error) {
    return apiResponse({ success: false, message: "Failed to delete organization", data: null, error: error instanceof Error ? error.message : "Internal server error", status: 500 });
  }
}
