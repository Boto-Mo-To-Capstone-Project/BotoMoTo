// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";

// Handle POST request to create a new organization
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create an organization",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin and superadmin users can create organizations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if the user already has an organization
    const existingOrg = await db.organization.findUnique({
      where: { adminId: user.id },
    });

    if (existingOrg) {
      return apiResponse({
        success: false,
        message: "User already has an organization",
        data: null,
        error: "Already exists",
        status: 400
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate organization data using helper
    const validation = validateWithZod(organizationSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, membersCount, photoUrl, letterUrl } = validation.data;

    // Create a new organization in the database
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
        admin: true,
      },
    });

    // Log audit details
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const audit = await db.audits.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
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

    // Return success response in consistent format
    return apiResponse({
      success: true,
      message: "Organization created successfully",
      data: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        membersCount: organization.membersCount,
        status: organization.status,
        photoUrl: organization.photoUrl,
        letterUrl: organization.letterUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        admin: {
          id: organization.admin.id,
          name: organization.admin.name,
          email: organization.admin.email,
        },
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    // Error response in consistent format
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

// Handle GET request to fetch organization details
export async function GET() {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view organizations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Fetch organizations for super admin (can view all organizations)
    if (user.role === ROLES.SUPER_ADMIN) {
      const organizations = await db.organization.findMany({
        include: {
          admin: true,
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

      // Return success response in consistent format for GET
      return apiResponse({
        success: true,
        message: "Organizations fetched successfully",
        data: organizations,
        error: null,
        status: 200
      });
    }

    // Fetch organization for admin (can't view all organizations)
    if (user.role === ROLES.ADMIN) {
      const organization = await db.organization.findUnique({
        where: { adminId: user.id },
        include: {
          admin: true,
          elections: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      return apiResponse({
        success: true,
        message: "Organization fetched successfully",
        data: organization,
        error: null,
        status: 200
      });
    }

    // Deny access for other roles
    return apiResponse({
      success: false,
      message: "You do not have permission to view organizations",
      data: null,
      error: "Forbidden",
      status: 403
    });
  } catch (error) {
    // Error response in consistent format for GET
    return apiResponse({
      success: false,
      message: "Failed to fetch organization(s)",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}