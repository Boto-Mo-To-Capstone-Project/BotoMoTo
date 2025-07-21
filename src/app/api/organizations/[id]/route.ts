import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";

// GET organization by ID
export async function GET(
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

    const { id } = await params;

    // Find the organization
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(id) },
      include: {
        admin: true,
        contactDetails: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only allow the admin of the organization or SuperAdmin to view
    if (
      session.user.role !== ROLES.SUPER_ADMIN &&
      organization.adminId !== session.user.id
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT (update) organization
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

    const { id } = await params;
    const body = await request.json();

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

    // Only allow the admin of the organization to update
    if (organization.adminId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Only allow updates if organization is pending
    if (organization.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Organization cannot be updated" },
        { status: 400 }
      );
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        description: body.description,
        membersCount: body.membersCount,
        frequency: body.frequency,
        // Update contact details
        contactDetails: {
          deleteMany: {},
          create: body.contactDetails.map((contact: any) => ({
            name: contact.name,
            email: contact.email,
            contactNum: contact.contactNum,
          })),
        },
      },
      include: {
        admin: true,
        contactDetails: true,
      },
    });

    // Create audit log
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    await prisma.audits.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "UPDATE",
        ipAddress,
        userAgent,
        resource: "organization",
        resourceId: id,
        details: {
          organizationName: organization.name,
          adminEmail: organization.admin.email,
          action: "update",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Organization updated successfully",
      data: updatedOrg,
    });
  } catch (error) {
    console.error("Update organization error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
