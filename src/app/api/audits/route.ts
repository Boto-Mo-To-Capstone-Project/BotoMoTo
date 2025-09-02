import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { ROLES } from "@/lib/constants";
import { withPerformanceLogging } from "@/lib/performance/middleware";

// GET /api/audits - Superadmin only
async function getAudits(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const action = url.searchParams.get('action');
    const resource = url.searchParams.get('resource');
    const actorRole = url.searchParams.get('actorRole');

    // Build query filters
    const where: any = {};

    // Add filter by action
    if (action && action !== 'all') {
      where.action = action;
    }

    // Add filter by resource
    if (resource && resource !== 'all') {
      where.resource = resource;
    }

    // Add filter by actor role
    if (actorRole && actorRole !== 'all') {
      where.actorRole = actorRole;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Default sorting by timestamp (newest first)
    const orderBy = { timestamp: 'desc' as const };

    // Fetch audits with pagination and search
    const [audits, totalCount] = await Promise.all([
      db.audits.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          affectedTables: {
            select: {
              tableAffected: true,
              recordId: true
            }
          }
        }
      }),
      db.audits.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return apiResponse({
      success: true,
      message: "Audits fetched successfully",
      data: {
        audits,
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
    console.error("Get audits error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch audits",
      error: typeof error === "string" ? error : "Internal server error",
      status: 500,
    });
  }
}

export const GET = withPerformanceLogging(getAudits as any);
