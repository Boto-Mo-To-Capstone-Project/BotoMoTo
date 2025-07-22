import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const organization = await db.organization.findUnique({
    where: { id: parseInt(id) },
    include: {
      admin: true,
    },
  });
  if (!organization) {
    return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
  }
  if (
    session.user.role !== ROLES.SUPER_ADMIN &&
    organization.adminId !== session.user.id
  ) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }
  return NextResponse.json({
    success: true,
    data: organization,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = params;
  const body = await request.json();
  const organization = await db.organization.findUnique({
    where: { id: parseInt(id) },
    include: { admin: true },
  });
  if (!organization) {
    return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
  }
  if (organization.adminId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }
  if (organization.status !== "PENDING") {
    return NextResponse.json(
      { success: false, error: "Organization cannot be updated" },
      { status: 400 }
    );
  }
  // Only update allowed fields
  const updatedOrg = await db.organization.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name,
      membersCount: body.membersCount,
      email: body.email,
    },
    include: { admin: true },
  });
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  await db.audits.create({
    data: {
      actorId: session.user.id,
      actorRole: session.user.role || 'ADMIN',
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
}
