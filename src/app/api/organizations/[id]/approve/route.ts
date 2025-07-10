import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
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

    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body; // action: "approve" or "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // Find the organization
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(id) },
      include: { admin: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Update organization status
    const newStatus =
      action === "approve"
        ? ORGANIZATION_STATUS.APPROVED
        : ORGANIZATION_STATUS.REJECTED;

    const updatedOrg = await prisma.organization.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      include: { admin: true },
    });

    // Update user approval status
    await prisma.user.update({
      where: { id: organization.adminId },
      data: { isApproved: action === "approve" },
    });

    // Create audit log
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    await prisma.audits.create({
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
