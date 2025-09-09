import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { z } from "zod";
import { field } from "@/lib/schema";

// Schema for password change validation using shared password validation
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: field.password("New password"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New password and confirmation must match",
  path: ["confirmPassword"]
});

// Handle POST request to change password
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user - any logged in user can change their own password
    const authResult = await requireAuth([ROLES.VOTER, ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const body = await request.json();
    
    // Validate request body
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return apiResponse({
        success: false,
        message: "Validation failed",
        error: validation.error.flatten().fieldErrors,
        status: 400,
      });
    }

    const { oldPassword, newPassword } = validation.data;

    // Get user's current password from database
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true, email: true }
    });

    if (!userData || !userData.password) {
      return apiResponse({
        success: false,
        message: "User not found or no password set",
        status: 404,
      });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, userData.password);
    if (!isOldPasswordValid) {
      return apiResponse({
        success: false,
        message: "Current password is incorrect",
        status: 400,
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    // Create audit log
    await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "USER",
      resourceId: user.id,
      message: "Password changed successfully"
    });

    return apiResponse({
      success: true,
      message: "Password changed successfully",
      status: 200,
    });

  } catch (error) {
    console.error("Error changing password:", error);
    return apiResponse({
      success: false,
      message: "Failed to change password",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
