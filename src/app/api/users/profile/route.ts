import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { z } from "zod";

// Schema for profile update validation
const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  organizationName: z.union([
    z.string().min(2, "Organization name must be at least 2 characters").max(100, "Organization name must be at most 100 characters"),
    z.literal("")
  ]).optional(),
  organizationEmail: z.union([
    z.string().email("Invalid organization email"),
    z.literal("")
  ]).optional(),
  numberOfMembers: z.union([
    z.string().regex(/^\d+$/, "Number of members must be a valid number"),
    z.literal("")
  ]).optional()
});

// Handle GET request to fetch current user's profile
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user - any logged in user can get their own profile
    const authResult = await requireAuth([ROLES.VOTER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Fetch user profile with organization details
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            membersCount: true,
            status: true
          }
        }
      },
    });

    if (!userData) {
      return apiResponse({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    // Create audit log for profile access
    await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "USER",
      resourceId: user.id,
      message: "Profile accessed"
    });

    return apiResponse({
      success: true,
      message: "Profile retrieved successfully",
      data: userData,
      status: 200,
    });

  } catch (error) {
    console.error("Error fetching profile:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch profile",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}

// Handle PUT request to update current user's profile
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the user - any logged in user can update their own profile
    const authResult = await requireAuth([ROLES.VOTER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const body = await request.json();
    
    // Clean up the data - convert empty strings to undefined for optional fields
    const cleanedData = {
      name: body.name,
      organizationName: body.organizationName || undefined,
      organizationEmail: body.organizationEmail || undefined,
      numberOfMembers: body.numberOfMembers || undefined
    };
    
    // Validate request body
    const validation = profileUpdateSchema.safeParse(cleanedData);
    if (!validation.success) {
      return apiResponse({
        success: false,
        message: "Validation failed",
        error: validation.error.flatten().fieldErrors,
        status: 400,
      });
    }

    const { name, organizationName, organizationEmail, numberOfMembers } = validation.data;

    // Get current user data for comparison
    const currentUserData = await db.user.findUnique({
      where: { id: user.id },
      include: {
        organization: true
      }
    });

    if (!currentUserData) {
      return apiResponse({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    // Track changes for audit log
    const changedFields: Record<string, { old: any; new: any }> = {};
    
    // Update user name if provided and different
    if (name && name !== currentUserData.name) {
      changedFields.name = { old: currentUserData.name, new: name };
    }

    // Update user information
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: name || currentUserData.name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            membersCount: true,
            status: true
          }
        }
      }
    });

    // Update organization information if user has an organization and is admin
    if (currentUserData.organization && user.role === ROLES.ADMIN) {
      const orgUpdateData: any = {};
      
      if (organizationName && organizationName !== currentUserData.organization.name) {
        orgUpdateData.name = organizationName;
        changedFields.organizationName = { old: currentUserData.organization.name, new: organizationName };
      }
      
      if (organizationEmail && organizationEmail !== currentUserData.organization.email) {
        orgUpdateData.email = organizationEmail;
        changedFields.organizationEmail = { old: currentUserData.organization.email, new: organizationEmail };
      }
      
      if (numberOfMembers && numberOfMembers !== currentUserData.organization.membersCount?.toString()) {
        orgUpdateData.membersCount = parseInt(numberOfMembers);
        changedFields.numberOfMembers = { old: currentUserData.organization.membersCount, new: numberOfMembers };
      }

      if (Object.keys(orgUpdateData).length > 0) {
        await db.organization.update({
          where: { id: currentUserData.organization.id },
          data: orgUpdateData
        });
      }
    }

    // Create audit log if there were changes
    if (Object.keys(changedFields).length > 0) {
      await createAuditLog({
        user,
        action: "UPDATE",
        request,
        resource: "USER",
        resourceId: user.id,
        changedFields,
        message: "Profile updated successfully"
      });
    }

    return apiResponse({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
      status: 200,
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return apiResponse({
      success: false,
      message: "Failed to update profile",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
