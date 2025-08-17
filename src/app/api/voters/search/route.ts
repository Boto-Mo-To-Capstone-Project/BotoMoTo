import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";

// Handle GET request to search voters
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to search voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can search voters",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

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
        message: "You can only search voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Build search query
    const searchTerm = query.trim();
    const voters = await db.voter.findMany({
      where: {
        electionId: electionIdInt,
        isDeleted: false,
        OR: [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { code: { contains: searchTerm } },
          { contactNum: { contains: searchTerm } },
          // Combined name search
          {
            AND: [
              { firstName: { contains: searchTerm.split(' ')[0] } },
              { lastName: { contains: searchTerm.split(' ')[1] || '' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        contactNum: true,
        isActive: true,
        isVerified: true,
        votingScope: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        // fetch one vote to compute hasVoted
        voteResponses: {
          where: { electionId: electionIdInt },
          select: { id: true, timestamp: true },
          take: 1
        }
      },
      take: Math.min(limit, 50), // Cap at 50 results
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    const votersWithComputed = voters.map(v => ({
      ...v,
      voted: v.voteResponses.length > 0
    }));

    return apiResponse({
      success: true,
      message: "Voter search completed successfully",
      data: {
        voters: votersWithComputed,
        query: searchTerm,
        resultCount: votersWithComputed.length,
        election: {
          id: election.id,
          name: election.name
        }
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Voter search error:", error);
    return apiResponse({
      success: false,
      message: "Failed to search voters",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
