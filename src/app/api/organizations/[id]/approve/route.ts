import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { findOrganizationById } from "@/lib/helpers/findOrganizationById";

// Handle PATCH request to approve/reject organization (superadmin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return apiResponse({
        success: false,
        message: "Invalid organization ID",
        error: "Bad Request",
        status: 400
      });
    }

    // Parse request body
    const body = await request.json();
    const { approve } = body;

    if (typeof approve !== "boolean") {
      return apiResponse({
        success: false,
        message: "Invalid 'approve' value. Must be boolean.",
        error: "Bad Request",
        status: 400
      });
    }

    // Find the organization
    const { organization, response } = await findOrganizationById(organizationId);
    if (!organization) return response;

    // Only allow action on PENDING organizations
    if (organization.status !== ORGANIZATION_STATUS.PENDING) {
      return apiResponse({
        success: false,
        message: `Organization is already ${organization.status.toLowerCase()}`,
        data: { currentStatus: organization.status },
        error: "Bad Request",
        status: 400
      });
    }

    const newStatus = approve
      ? ORGANIZATION_STATUS.APPROVED
      : ORGANIZATION_STATUS.REJECTED;

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { status: newStatus }
    });

    const audit = await createAuditLog({
      user,
      action: approve ? "APPROVE" : "REJECT",
      request,
      resource: "ORGANIZATION",
      resourceId: organizationId,
      changedFields: {
        status: { old: organization.status, new: newStatus }
      },
      message: `${approve ? "Approved" : "Rejected"} organization: ${organization.name}`
    });

    return apiResponse({
      success: true,
      message: `Organization ${approve ? "approved" : "rejected"} successfully`,
      data: updatedOrg,
      status: 200
    });
  } catch (error) {
    console.error("Organization approval error:", error);
    return apiResponse({
      success: false,
      message: "Failed to approve/reject organization",
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
