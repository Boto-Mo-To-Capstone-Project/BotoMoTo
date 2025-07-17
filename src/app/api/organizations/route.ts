import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only allow ADMIN users to create organizations
    if (session.user.role !== ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, error: "Only admin users can create organizations" },
        { status: 403 }
      );
    }

    // Check if user already has an organization
    const existingOrg = await prisma.organization.findUnique({
      where: { adminId: session.user.id },
    });

    if (existingOrg) {
      return NextResponse.json(
        { success: false, error: "User already has an organization" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, membersCount } = body;

    // Validate required fields
    if (!name || !email || !membersCount) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        adminId: session.user.id,
        name,
        email,
        membersCount: Number(membersCount),
        status: ORGANIZATION_STATUS.PENDING,
      },
      include: {
        admin: true,
      },
    });

    // The relationship is already established through the Organization's adminId field
    // No need to update the user record

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
        action: "CREATE",
        ipAddress,
        userAgent,
        resource: "organization",
        resourceId: organization.id.toString(),
        details: {
          organizationName: organization.name,
          membersCount: organization.membersCount,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Organization created successfully",
      data: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
      },
    });
  } catch (error) {
    console.error("Organization creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // SuperAdmin can see all organizations
    if (session.user.role === ROLES.SUPER_ADMIN) {
      const organizations = await prisma.organization.findMany({
        include: {
          admin: true,
          contactDetails: true,
          elections: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        data: organizations,
      });
    }

    // Admin can only see their own organization
    if (session.user.role === ROLES.ADMIN) {
      const organization = await prisma.organization.findUnique({
        where: { adminId: session.user.id },
        include: {
          admin: true,
          contactDetails: true,
          elections: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: organization,
      });
    }

    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Organization fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
