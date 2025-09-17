// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
// import { validateWithZod } from "@/lib/validateWithZod";
// import { userSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
// import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Core handler
async function getAdmins(req: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const admins = await db.user.findMany({
      where: { role: ROLES.ADMIN },
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
      orderBy: { createdAt: "desc" },
    });

    const audit = await createAuditLog({
      user,
      action: "READ",
      request: req,
      resource: "USER",
      message: "Viewed all admin users (superadmin)",
    });

    return apiResponse({
      success: true,
      message: "Admins fetched successfully",
      data: { admins, audit },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error("Superadmin GET Admins error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch admins",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}

// ✅ Wrap in middleware
export const GET = withPerformanceLogging(getAdmins as any);
