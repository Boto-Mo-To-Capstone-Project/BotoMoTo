// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
// import { validateWithZod } from "@/lib/validateWithZod";
// import { userSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { hash } from "bcryptjs";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

async function getAdmin(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;

    const admin = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        password: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!admin) {
      return apiResponse({
        success: false,
        message: "Admin not found",
        data: null,
        error: "Not found",
        status: 404,
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request: req,
      resource: "USER",
      message: `Viewed admin with ID: ${id}`,
    });

    return apiResponse({
      success: true,
      message: "Admin fetched successfully",
      data: { admin, audit },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error("Superadmin GET Admin by ID error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch admin",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}

// ✅ Superadmin PATCH route: update password + role only
async function updateAdmin(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate: must be SUPER_ADMIN
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    if (!id) {
      return apiResponse({
        success: false,
        message: "User ID required",
        data: null,
        error: "Bad Request",
        status: 400,
      });
    }

    // Parse body
    const body = await req.json();
    const { password } = body;

    if (!password ) {
      return apiResponse({
        success: false,
        message: "Nothing to update. Provide password.",
        data: null,
        error: "Bad Request",
        status: 400,
      });
    }

    // Find existing user
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return apiResponse({
        success: false,
        message: "User not found",
        data: null,
        error: "Not Found",
        status: 404,
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (password) {
      updateData.password = await hash(password, 12);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    // Track changed fields for audit
    const changedFields: Record<string, { old: any; new: any }> = {};

    if (password) {
      changedFields.password = { old: "[HIDDEN]", new: "[UPDATED]" };
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request: req,
      resource: "USER",
      resourceId: updatedUser.id,
      changedFields,
      message: "Superadmin updated admin credentials",
    });

    return apiResponse({
      success: true,
      message: "Admin updated successfully",
      data: {
        user: updatedUser,
        audit,
      },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error("Superadmin updateAdmin error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update admin",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}

// soft delete, patch
async function deleteAdmin(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate superadmin
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    if (!id) {
      return apiResponse({
        success: false,
        message: "User ID is required",
        data: null,
        error: "Bad Request",
        status: 400,
      });
    }

    // Find user
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return apiResponse({
        success: false,
        message: "User not found",
        data: null,
        error: "Not Found",
        status: 404,
      });
    }

    // Toggle isDeleted
    const newDeletedStatus = !existingUser.isDeleted;

    const updatedUser = await db.user.update({
      where: { id },
      data: { 
        isDeleted: newDeletedStatus,
        deletedAt: newDeletedStatus ? new Date() : null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    // Audit log
    const audit = await createAuditLog({
      user,
      action: newDeletedStatus ? "DELETE" : "RESTORE",
      request: req,
      resource: "USER",
      resourceId: updatedUser.id,
      deletionType: "SOFT",
      message: newDeletedStatus
        ? "Superadmin soft-deleted a user"
        : "Superadmin restored a soft-deleted user",
    });

    return apiResponse({
      success: true,
      message: newDeletedStatus
        ? "User soft-deleted successfully"
        : "User restored successfully",
      data: { user: updatedUser, audit },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error("Superadmin toggle delete error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update user deletion status",
      data: null,
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
}

// ✅ Wrap in middleware
export const GET = withPerformanceLogging(getAdmin as any);
export const PATCH = withPerformanceLogging(updateAdmin as any);
export const DELETE = withPerformanceLogging(deleteAdmin as any);