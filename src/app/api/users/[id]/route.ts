// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { userSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

// Handle GET request to fetch a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view this user",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const userId = params.id;

    // Fetch user info
    const userData = await db.user.findUnique({
      where: { id: userId },
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
            status: true
          }
        }
      },
    });

    if (!userData) {
      return apiResponse({
        success: false,
        message: "User not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions
    // Super admin can view any user
    // Admin can only view their own profile
    // Voters cannot access this endpoint
    if (user.role === ROLES.VOTER || 
        (user.role === ROLES.ADMIN && user.id !== userId)) {
      return apiResponse({
        success: false,
        message: "You can only view your own profile",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "USER",
      resourceId: userData.id,
      message: `Viewed user: ${userData.name}`,
    });

    return apiResponse({
      success: true,
      message: "User fetched successfully",
      data: {
        user: userData,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("User fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch user",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to update users",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const userId = params.id;

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(userSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, role, password } = validation.data;

    // Fetch existing user
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return apiResponse({
        success: false,
        message: "User not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions
    // Super admin can update any user
    // Admin can only update their own profile (except role)
    // Voters cannot access this endpoint
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to update users",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    if (user.role === ROLES.ADMIN && user.id !== userId) {
      return apiResponse({
        success: false,
        message: "You can only update your own profile",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Admin users cannot change their own role
    if (user.role === ROLES.ADMIN && user.id === userId && role !== existingUser.role) {
      return apiResponse({
        success: false,
        message: "You cannot change your own role",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return apiResponse({
          success: false,
          message: "Email is already taken by another user",
          data: null,
          error: "Already exists",
          status: 400
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      ...(user.role === ROLES.SUPER_ADMIN && { role }) // Only super admin can change roles
    };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
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
            status: true
          }
        }
      },
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "email", "role"] as const) {
      if (existingUser[key] !== updatedUser[key]) {
        changedFields[key] = { old: existingUser[key], new: updatedUser[key] };
      }
    }
    if (password) {
      changedFields.password = { old: "[HIDDEN]", new: "[UPDATED]" };
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "USER",
      resourceId: updatedUser.id,
      changedFields,
    });

    return apiResponse({
      success: true,
      message: "User updated successfully",
      data: {
        user: updatedUser,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("User update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update user",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete a specific user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to delete users",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only super admin can delete users
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only super admin users can delete users",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const userId = params.id;

    // Fetch existing user
    const existingUser = await db.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return apiResponse({
        success: false,
        message: "User not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Prevent deletion of super admin users (including self)
    if (existingUser.role === ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Super admin users cannot be deleted",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Hard delete user
    const deletedUser = await db.user.delete({
      where: { id: userId },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "USER",
      resourceId: deletedUser.id,
      deletionType: "HARD",
      message: `Deleted user: ${existingUser.name}`,
    });

    return apiResponse({
      success: true,
      message: "User deleted successfully",
      data: {
        user: {
          id: deletedUser.id,
          name: existingUser.name,
          email: existingUser.email
        },
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("User deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete user",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
