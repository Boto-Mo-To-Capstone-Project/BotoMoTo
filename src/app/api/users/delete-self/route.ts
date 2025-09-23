// ✅ Admin PATCH route: self soft-delete (mark account as deleted)
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { ROLES } from "@/lib/constants";

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate admin (or any logged-in user depending on your requirement)
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Find own account
    const existingUser = await db.user.findUnique({
      where: { id: user.id },
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

    // If already deleted, prevent duplicate action
    if (existingUser.isDeleted) {
      return apiResponse({
        success: false,
        message: "Account is already deleted",
        data: null,
        error: "Conflict",
        status: 409,
      });
    }

    // Set isDeleted = true (no toggle, only one-way)
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { 
        isDeleted: true,
        deletedAt: new Date()
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
      },
    });

    // Audit log
    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request: req,
      resource: "USER",
      resourceId: updatedUser.id,
      deletionType: "SOFT",
      message: "Admin soft-deleted their own account",
    });

    return apiResponse({
      success: true,
      message: "Your account has been deleted successfully",
      data: { user: updatedUser, audit },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error("Admin self-delete error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete account",
      data: null,
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
}
