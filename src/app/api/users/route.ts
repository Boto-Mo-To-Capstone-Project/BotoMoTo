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

// Handle GET request to fetch users
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view users",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Fetch users for super admin (can view all users)
    if (user.role === ROLES.SUPER_ADMIN) {
      const users = await db.user.findMany({
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
        orderBy: { createdAt: "desc" },
      });

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "USER",
        message: "Viewed all users (super admin)",
      });

      return apiResponse({
        success: true,
        message: "Users fetched successfully",
        data: {
          users,
          audit
        },
        error: null,
        status: 200
      });
    }

    // Admin can only view their own user info
    if (user.role === ROLES.ADMIN) {
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

      const audit = await createAuditLog({
        user,
        action: "READ",
        request,
        resource: "USER",
        resourceId: user.id,
        message: "Viewed own user info (admin)",
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
    }

    // Deny access for other roles
    return apiResponse({
      success: false,
      message: "You do not have permission to view users",
      data: null,
      error: "Forbidden",
      status: 403
    });
  } catch (error) {
    console.error("Users fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch users",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new user
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create a user",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Only super admin can create users
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only super admin users can create users",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Parse request body
    const body = await request.json();

    // Validate user data using helper
    const validation = validateWithZod(userSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, role, password } = validation.data;

    // Check if user with email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return apiResponse({
        success: false,
        message: "User with this email already exists",
        data: null,
        error: "Already exists",
        status: 400
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create a new user in the database
    const newUser = await db.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
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
      },
    });

    // Log creation audit
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "USER",
      resourceId: newUser.id,
      newData: newUser,
    });

    // Return success response
    return apiResponse({
      success: true,
      message: "User created successfully",
      data: {
        user: newUser,
        audit
      },
      error: null,
      status: 201
    });
  } catch (error) {
    console.error("User creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create user",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete all users (super admin only)
export async function DELETE(request: NextRequest) {
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

    // Only super admin can delete all users
    if (user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only super admin users can delete all users",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Get count of users to be deleted (excluding super admins and current user)
    const usersCount = await db.user.count({
      where: {
        AND: [
          { role: { not: ROLES.SUPER_ADMIN } },
          { id: { not: user.id } }
        ]
      }
    });

    if (usersCount === 0) {
      return apiResponse({
        success: false,
        message: "No users found to delete",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Delete all users except super admins and current user
    const deletedUsers = await db.user.deleteMany({
      where: {
        AND: [
          { role: { not: ROLES.SUPER_ADMIN } },
          { id: { not: user.id } }
        ]
      },
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "USER",
      deletionType: "HARD",
      message: `Deleted ${deletedUsers.count} users`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedUsers.count} users`,
      data: {
        deletedCount: deletedUsers.count,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Users deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete users",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update logged-in user's own information
export async function PUT(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to update your profile",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Parse request body
    const body = await request.json();

    // Create a schema for profile updates (excludes role changes)
    const profileUpdateSchema = userSchema.omit({ role: true });
    const validation = validateWithZod(profileUpdateSchema, body);
    if (!('data' in validation)) return validation;
    const { name, email, password } = validation.data;

    // Fetch existing user data
    const existingUser = await db.user.findUnique({
      where: { id: user.id }
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
    };

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: user.id },
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
    for (const key of ["name", "email"] as const) {
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
      message: "Updated own profile",
    });

    return apiResponse({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update profile",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
