// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/helpers/requireAuth";

import { withPerformanceLogging } from "@/lib/performance/middleware";

async function getAdmins(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Build query filters
    const where: any = {
      role: ROLES.ADMIN
    };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch admins with pagination
    const [admins, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          organization: {
            select: {
              name: true,
              status: true
            }
          }
        }
      }),
      db.user.count({ where })
    ]);

    // Create pagination info
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const audit = await createAuditLog({
      user,
      action: "READ",
      request: request,
      resource: "USER",
      message: "Viewed all admin users (superadmin)",
    });

    return apiResponse({
      success: true,
      message: "Admins fetched successfully",
      data: { 
        admins, 
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
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

export const GET = withPerformanceLogging(getAdmins as any);
