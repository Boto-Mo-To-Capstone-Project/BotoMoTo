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

    // Fetch latest audits (no relations defined; actorId is a string)
    const audits = await db.audits.findMany({
      orderBy: { timestamp: "desc" },
    });

    return apiResponse({
      success: true,
      message: "Audits fetched successfully",
      data: { audits, totalCount: audits.length },
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
