import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { ROLES } from "@/lib/constants";
import db from "@/lib/db/db";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth([ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;

    const sessions = await db.session.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const activeSessions = await db.session.count({
      where: {
        expires: {
          gt: new Date()
        }
      }
    });

    return apiResponse({
      success: true,
      message: "Sessions retrieved successfully",
      data: {
        totalSessions: sessions.length,
        activeSessions,
        sessions: sessions.map(s => ({
          id: s.id,
          sessionToken: s.sessionToken.substring(0, 10) + '...',
          userId: s.userId,
          userEmail: s.user.email,
          userRole: s.user.role,
          expires: s.expires,
          createdAt: s.createdAt,
          isActive: s.expires > new Date()
        }))
      }
    });
  } catch (error) {
    console.error("Debug sessions error:", error);
    return apiResponse({
      success: false,
      message: "Failed to retrieve sessions",
      error: "Debug sessions error",
      status: 500
    });
  }
}
