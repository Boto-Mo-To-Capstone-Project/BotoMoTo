// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch all organizations (superadmin only)
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view organizations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only superadmin can view all organizations
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only superadmin can view all organizations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const organizations = await db.organization.findMany({
      where: { isDeleted: false },
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
          },
        },
        _count: {
          select: {
            elections: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ORGANIZATION",
      message: "Viewed all organizations (superadmin)",
    });

    return apiResponse({
      success: true,
      message: "Organizations fetched successfully",
      data: {
        organizations,
        totalCount: organizations.length,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get organizations error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch organizations",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new organization (admin only)
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create an organization",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only admin users can create organizations (superadmin should not have affiliated org)
    if (user.role !== ROLES.ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create organizations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if the user already has an organization
    const existingOrg = await db.organization.findUnique({
      where: { adminId: user.id },
      include: { admin: true },
    });

    // If exists but deleted, restore it with new data
    if (existingOrg?.isDeleted) {
      const body = await request.json();
      const validation = validateWithZod(organizationSchema, body);
      if (!('data' in validation)) return validation;
      
      const { name, email, membersCount, photoUrl, letterUrl } = validation.data;

      const restoredOrg = await db.organization.update({
        where: { id: existingOrg.id },
        data: { 
          isDeleted: false,
          deletedAt: null,
          name,
          email,
          membersCount: Number(membersCount),
          photoUrl,
          letterUrl,
          status: ORGANIZATION_STATUS.PENDING, // Reset status on restore
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

      const audit = await createAuditLog({
        user,
        action: "RESTORE",
        request,
        resource: "ORGANIZATION",
        resourceId: restoredOrg.id,
        newData: restoredOrg,
        message: "Restored and updated deleted organization",
      });

      return apiResponse({
        success: true,
        message: "Organization restored and updated successfully",
        data: { organization: restoredOrg, audit },
        error: null,
        status: 200
      });
    }

    // If exists and not deleted
    if (existingOrg) {
      return apiResponse({
        success: false,
        message: "User already has an organization",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateWithZod(organizationSchema, body);
    if (!('data' in validation)) return validation;
    
    const { name, email, membersCount, photoUrl, letterUrl } = validation.data;

    // Check if organization name already exists
    const nameExists = await db.organization.findFirst({
      where: {
        name,
        isDeleted: false
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

    // Create a new organization
    const organization = await db.organization.create({
      data: {
        adminId: user.id,
        name,
        email,
        membersCount: Number(membersCount),
        photoUrl,
        letterUrl,
        status: ORGANIZATION_STATUS.PENDING,
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
      },
    });

    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ORGANIZATION",
      resourceId: organization.id,
      newData: organization,
      message: "Created new organization",
    });

    return apiResponse({
      success: true,
      message: "Organization created successfully",
      data: {
        organization,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("Organization creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create organization",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
