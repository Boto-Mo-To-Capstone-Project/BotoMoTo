import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { ROLES } from "@/lib/constants";
import db from "@/lib/db/db";

/**
 * GET /api/elections/[id]/admin-number
 * Get the admin-specific election number (1, 2, 3...) instead of database ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const electionId = parseInt(id);

    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Get all elections for this admin, ordered by creation date (oldest first)
    const adminElections = await db.election.findMany({
      where: {
        isDeleted: false,
        organization: { 
          adminId: user.id 
        }
      },
      select: {
        id: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc' // Oldest first for 1-based numbering
      }
    });

    // Find the index of the current election (1-based)
    const electionIndex = adminElections.findIndex((e: { id: number }) => e.id === electionId);
    const electionNumber = electionIndex !== -1 ? electionIndex + 1 : null;

    if (electionNumber === null) {
      return apiResponse({
        success: false,
        message: "Election not found or not accessible",
        data: null,
        error: "Not Found", 
        status: 404
      });
    }

    return apiResponse({
      success: true,
      message: "Election number retrieved successfully",
      data: {
        electionId,
        electionNumber
      },
      status: 200
    });

  } catch (error) {
    console.error("Get admin election number error:", error);
    return apiResponse({
      success: false,
      message: "Failed to get election number",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
