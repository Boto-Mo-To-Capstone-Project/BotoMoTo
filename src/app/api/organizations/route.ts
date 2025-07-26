// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { organizationSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit"; // Assuming you have a utility for creating audit logs

// Handle GET request to fetch organization details
export async function GET(request: NextRequest) {
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

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "ORGANIZATION",
        message: "Viewed all organizations (super admin)",
      });

      // Return success response in consistent format for GET
      return apiResponse({
        success: true,
        message: "Organizations fetched successfully",
        data: {
          organizations,
          audit
        },
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

      // if walang organization, return error
      if (!organization) {
        return apiResponse({ 
          success: false, 
          message: "Organization not found", 
          data: null, 
          error: "Not Found", 
          status: 404 });
      }

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "ORGANIZATION",
        resourceId: organization.id,
        message: "Viewed own organization (admin)",
      });

      return apiResponse({
        success: true,
        message: "Organization fetched successfully",
        data: {
          organization,
          audit
        },
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

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "ORGANIZATION",
      resourceId: organization.id,
      newData: organization,
    });

    // Return success response in consistent format
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

// Handle PUT request to update an existing organization
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;
    if (!user) return apiResponse({ success: false, message: "Unauthorized", data: null, error: "Unauthorized", status: 401 });

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(organizationSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, membersCount, photoUrl, letterUrl } = validation.data;

    // Fetch existing org
    const existingOrg = await db.organization.findUnique({ where: { adminId: user.id } });
    if (!existingOrg) return apiResponse({ success: false, message: "Organization not found", data: null, error: "Not Found", status: 404 });

    // Update organization
    const updatedOrg = await db.organization.update({
      where: { id: existingOrg.id },
      data: { name, email, membersCount, photoUrl, letterUrl },
      include: { admin: true },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "email", "membersCount", "photoUrl", "letterUrl"] as const) {
      if (existingOrg[key] !== updatedOrg[key]) {
        changedFields[key] = { old: existingOrg[key], new: updatedOrg[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ORGANIZATION",
      resourceId: updatedOrg.id,
      changedFields,
    });

    // Respond with success
    return apiResponse({ 
      success: true, 
      message: "Organization updated", 
      data: {
        updatedOrg,
        audit
      },
      error: null, 
      status: 200 
    });
  } catch (error) {
    // Error handling
    console.error("Organization update error:", error);
    return apiResponse({ success: false, message: "Failed to update organization", data: null, error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Handle DELETE request to soft-delete an organization
export async function DELETE(request: NextRequest) {
  try {
    // check if user is authenticated
    const session = await auth();
    const user = session?.user;
    if (!user) return apiResponse({ success: false, message: "Unauthorized", data: null, error: "Unauthorized", status: 401 });

    // check if user has an organization
    const organization = await db.organization.findUnique({ where: { adminId: user.id } });
    if (!organization) return apiResponse({ success: false, message: "Organization not found", data: null, error: "Not Found", status: 404 });

    // soft delete organization
    const deletedOrg = await db.organization.update({
      where: { id: organization.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "ORGANIZATION",
      resourceId: deletedOrg.id,
      deletionType: "SOFT",
    });

    return apiResponse({ 
      success: true, 
      message: "Organization deleted", 
      data: {
        deletedOrg, 
        audit
      },
      error: null, 
      status: 200 
    });
  } catch (error) {
    console.error("Organization deletion error:", error);
    return apiResponse({ success: false, message: "Failed to delete organization", data: null, error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// things to do:
// if deleted na ang org, dapat di na sya accessible ng admin user
// create a conditional to check the field `isDeleted` in the organization model
// if isDeleted is true, return an error response indicating the organization has been deleted
// if they created again, it should make the isDeleted field false and restore the organization

