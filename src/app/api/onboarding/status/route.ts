import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Only admins (and superadmins) need onboarding
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Not applicable for this role" },
        { status: 403 }
      );
    }
    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            contactDetails: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    const hasOrganization = !!user.organization;
    const organizationStatus = user.organization?.status || null;
    return NextResponse.json({
      success: true,
      hasOrganization,
      organizationStatus,
      isApproved: user.isApproved,
      organization: user.organization || null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error("Onboarding status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
