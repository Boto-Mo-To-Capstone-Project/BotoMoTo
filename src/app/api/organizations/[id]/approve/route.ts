import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only SuperAdmin can approve organizations
    if (session.user.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: "Only SuperAdmin can approve organizations" },
        { status: 403 }
      );
    }

    // Get params asynchronously
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { action, reason } = body;
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Find the organization
    const organizationId = parseInt(id);
    if (isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      include: { admin: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update organization status
    const newStatus = action === "approve"
      ? ORGANIZATION_STATUS.APPROVED
      : ORGANIZATION_STATUS.REJECTED;

    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: { status: newStatus },
      include: { admin: true },
    });

    // Create audit log
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await db.audits.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: action === "approve" ? "APPROVE" : "REJECT",
        ipAddress,
        userAgent,
        resource: "organization",
        resourceId: id,
        details: {
          organizationName: organization.name,
          adminEmail: organization.admin.email,
          action,
          reason: reason || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Organization ${action}d successfully`,
      data: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        status: updatedOrg.status,
        adminEmail: updatedOrg.admin.email,
      },
    });
  } catch (error) {
    console.error("Organization approval error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}