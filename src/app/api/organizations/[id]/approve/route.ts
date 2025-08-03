import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

// Handle PATCH request to approve/reject organization (superadmin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to approve/reject organizations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only SuperAdmin can approve organizations
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only superadmin can approve/reject organizations",
        data: null,
        error: "Forbidden",
        status: 403
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

    // Parse request body
    const body = await request.json();
    const { action, reason } = body;
    
    if (!action || !["approve", "reject"].includes(action)) {
      return apiResponse({
        success: false,
        message: "Invalid action. Must be 'approve' or 'reject'",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Find the organization
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

    // Check if organization is in PENDING status
    if (organization.status !== ORGANIZATION_STATUS.PENDING) {
      return apiResponse({
        success: false,
        message: `Organization is already ${organization.status.toLowerCase()}`,
        data: { currentStatus: organization.status },
        error: "Bad Request",
        status: 400
      });
    }

    // Update organization status
    const newStatus = action === "approve"
      ? ORGANIZATION_STATUS.APPROVED
      : ORGANIZATION_STATUS.REJECTED;

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { status: newStatus },
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

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: action === "approve" ? "APPROVE" : "REJECT",
      request,
      resource: "ORGANIZATION",
      resourceId: organizationId,
      changedFields: {
        status: { old: organization.status, new: newStatus }
      },
      message: `${action === "approve" ? "Approved" : "Rejected"} organization: ${organization.name}${reason ? ` - Reason: ${reason}` : ""}`,
    });

    return apiResponse({
      success: true,
      message: `Organization ${action}d successfully`,
      data: {
        organization: {
          id: updatedOrg.id,
          name: updatedOrg.name,
          status: updatedOrg.status,
          adminEmail: updatedOrg.admin.email,
          adminName: updatedOrg.admin.name
        },
        action,
        reason: reason || null,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Organization approval error:", error);
    return apiResponse({
      success: false,
      message: "Failed to approve/reject organization",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}