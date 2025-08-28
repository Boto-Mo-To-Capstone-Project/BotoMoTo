import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle GET request to search positions
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get search parameters
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const electionId = url.searchParams.get('electionId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return apiResponse({
        success: false,
        message: "Search query must be at least 2 characters long",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (!electionId) {
      return apiResponse({
        success: false,
        message: "Election ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Verify election exists and user has access
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        organization: {
          select: {
            id: true,
            adminId: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only search positions from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Build search query
    const searchTerm = query.trim();
    const positions = await db.position.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        OR: [
          { name: { contains: searchTerm } },
        ]
      },
      select: {
        id: true,
        name: true,
        voteLimit: true,
        numOfWinners: true,
        order: true,
        votingScope: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            candidates: true,
            voteResponses: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      take: Math.min(limit, 50), // Cap at 50 results
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return apiResponse({
      success: true,
      message: "Position search completed successfully",
      data: {
        positions,
        query: searchTerm,
        resultCount: positions.length,
        election: {
          id: election.id,
          name: election.name
        }
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Position search error:", error);
    return apiResponse({
      success: false,
      message: "Failed to search positions",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
