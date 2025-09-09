import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

/**
 * GET /api/admin/dashboard/stats
 * 
 * Returns dashboard statistics for admin
 * Includes elections, voters, and completion data for admin's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user - admin only
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get admin's organization ID only
    const organization = await db.organization.findFirst({
      where: { adminId: user.id },
      select: { id: true }
    });

    if (!organization) {
      return apiResponse({
        success: false,
        message: "Organization not found for admin",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Get dashboard statistics (only what's needed by frontend)
    const [
      activeElections,
      draftElections,
      totalVoters,
      votersWhoVoted,
      recentElections
    ] = await Promise.all([
      // Active/ongoing elections
      db.election.count({
        where: { 
          orgId: organization.id, 
          isDeleted: false, 
          status: ELECTION_STATUS.ACTIVE
        }
      }),

      // Draft elections
      db.election.count({
        where: { 
          orgId: organization.id, 
          isDeleted: false, 
          status: ELECTION_STATUS.DRAFT
        }
      }),

      // Total voters across all elections
      db.voter.count({
        where: { 
          election: { orgId: organization.id, isDeleted: false },
          isDeleted: false 
        }
      }),

      // Voters who have voted across all elections
      db.voter.count({
        where: { 
          election: { orgId: organization.id, isDeleted: false },
          isDeleted: false,
          voteResponses: { some: {} }
        }
      }),

      // Recent elections (only name and status needed)
      db.election.findMany({
        where: { orgId: organization.id, isDeleted: false },
        select: {
          name: true,
          status: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const dashboardStats = {
      summary: {
        totalVoters,
        ongoingElections: activeElections,
        draftElections,
        voterTurnout: totalVoters > 0 ? Math.round((votersWhoVoted / totalVoters) * 100) : 0
      },
      recentElections: recentElections.map(election => ({
        name: election.name,
        status: election.status
      }))
    };

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: organization.id,
      message: `Viewed admin dashboard statistics`,
    });

    return apiResponse({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: {
        stats: dashboardStats,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Admin dashboard statistics error:", error);
    return apiResponse({
      success: false,
      message: "Failed to retrieve dashboard statistics",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
