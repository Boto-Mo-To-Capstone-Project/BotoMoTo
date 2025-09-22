import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { adminTransferSchema } from "@/lib/schema";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Only current admin can transfer
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const currentAdmin = authResult.user;

    const body = await request.json();
    const validation = adminTransferSchema.safeParse(body);
    
    if (!validation.success) {
      return apiResponse({
        success: false,
        message: "Validation failed",
        error: validation.error.flatten().fieldErrors,
        status: 400,
      });
    }

    const { newAdminEmail, currentPassword, transferReason } = validation.data;

    // Verify current admin's password
    const currentUser = await db.user.findUnique({
      where: { id: currentAdmin.id },
      include: { organization: true }
    });

    if (!currentUser || !currentUser.password) {
      return apiResponse({
        success: false,
        message: "User not found or no password set",
        status: 404,
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword as string, currentUser.password!);
    if (!isValidPassword) {
      return apiResponse({
        success: false,
        message: "Invalid current password",
        status: 401,
      });
    }

    if (!currentUser.organization) {
      return apiResponse({
        success: false,
        message: "No organization found for current admin",
        status: 404,
      });
    }

    // Check if new admin email exists and is not the current admin
    if (newAdminEmail === currentUser.email) {
      return apiResponse({
        success: false,
        message: "Cannot transfer to the same email address",
        status: 400,
      });
    }

    // Find or create the new admin user
    let newAdmin = await db.user.findUnique({
      where: { email: newAdminEmail }
    });

    // Check if new admin is already deleted before transaction
    if (newAdmin?.isDeleted) {
      return apiResponse({
        success: false,
        message: "Cannot transfer to a deleted account",
        status: 400,
      });
    }

    // Use database transaction for atomic transfer
    const result = await db.$transaction(async (tx) => {
      // If user doesn't exist, create them
      if (!newAdmin) {
        newAdmin = await tx.user.create({
          data: {
            email: newAdminEmail,
            role: ROLES.ADMIN,
            name: `Admin - ${currentUser.organization?.name || 'Organization'}`,
            // They'll need to set password on first login via forgot password
          }
        });
      } else {
        // Update existing user to admin role
        newAdmin = await tx.user.update({
          where: { id: newAdmin.id },
          data: { role: ROLES.ADMIN }
        });
      }

      // Transfer organization ownership
      const updatedOrg = await tx.organization.update({
        where: { id: currentUser.organization!.id },
        data: { adminId: newAdmin!.id }
      });

      // Mark current admin as deleted (soft delete like your existing delete API)
      await tx.user.update({
        where: { id: currentAdmin.id },
        data: { 
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      return { newAdmin, updatedOrg };
    });

    // Create audit log for the transfer
    await createAuditLog({
      user: currentAdmin,
      action: "UPDATE",
      request,
      resource: "ORGANIZATION",
      resourceId: currentUser.organization.id.toString(),
      changedFields: {
        adminId: { old: currentAdmin.id, new: result.newAdmin.id },
        transferReason: { old: null, new: transferReason || "Admin transfer" },
        previousAdminDeleted: { old: false, new: true }
      },
      message: `Admin transferred from ${currentUser.email} to ${newAdminEmail}. Previous admin account marked as deleted.`
    });

    return apiResponse({
      success: true,
      message: "Admin transfer completed successfully. Your account has been marked as deleted.",
      data: {
        newAdmin: {
          id: result.newAdmin.id,
          email: result.newAdmin.email,
          name: result.newAdmin.name
        },
        organization: result.updatedOrg,
        previousAdminDeleted: true
      },
      status: 200,
    });

  } catch (error) {
    console.error("Error transferring admin:", error);
    return apiResponse({
      success: false,
      message: "Failed to transfer admin",
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    });
  }
}
