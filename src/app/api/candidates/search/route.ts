import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";

// Handle GET request to search candidates
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const query = url.searchParams.get('query');
    const positionId = url.searchParams.get('positionId');
    const partyId = url.searchParams.get('partyId');
    const hasImage = url.searchParams.get('hasImage');
    const hasBio = url.searchParams.get('hasBio');
    const hasExperience = url.searchParams.get('hasExperience');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

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
        status: true,
        organization: {
          select: {
            id: true,
            adminId: true,
            name: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election or if it's a voter with access
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only search candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Build complex where clause
    const whereClause: any = {
      electionId: electionIdInt,
      isDeleted: false
    };

    // Add search query filter
    if (query && query.trim()) {
      whereClause.OR = [
        {
          voter: {
            firstName: { contains: query.trim(), mode: 'insensitive' }
          }
        },
        {
          voter: {
            lastName: { contains: query.trim(), mode: 'insensitive' }
          }
        },
        {
          voter: {
            email: { contains: query.trim(), mode: 'insensitive' }
          }
        },
        {
          bio: { contains: query.trim(), mode: 'insensitive' }
        },
        {
          position: {
            name: { contains: query.trim(), mode: 'insensitive' }
          }
        },
        {
          party: {
            name: { contains: query.trim(), mode: 'insensitive' }
          }
        }
      ];
    }

    // Add position filter
    if (positionId) {
      const positionIdInt = parseInt(positionId);
      if (!isNaN(positionIdInt)) {
        whereClause.positionId = positionIdInt;
      }
    }

    // Add party filter
    if (partyId) {
      if (partyId === 'independent') {
        whereClause.partyId = null;
      } else {
        const partyIdInt = parseInt(partyId);
        if (!isNaN(partyIdInt)) {
          whereClause.partyId = partyIdInt;
        }
      }
    }

    // Add image filter
    if (hasImage === 'true') {
      whereClause.imageUrl = { not: null };
    } else if (hasImage === 'false') {
      whereClause.imageUrl = null;
    }

    // Add bio filter
    if (hasBio === 'true') {
      whereClause.bio = { not: null };
    } else if (hasBio === 'false') {
      whereClause.bio = null;
    }

    // Add experience filter (this requires a more complex query)
    let experienceFilter = null;
    if (hasExperience === 'true') {
      experienceFilter = {
        OR: [
          { leaderships: { some: {} } },
          { workExps: { some: {} } }
        ]
      };
    } else if (hasExperience === 'false') {
      experienceFilter = {
        AND: [
          { leaderships: { none: {} } },
          { workExps: { none: {} } }
        ]
      };
    }

    if (experienceFilter) {
      whereClause.AND = whereClause.AND ? [...whereClause.AND, experienceFilter] : [experienceFilter];
    }

    // Get total count for pagination
    const totalCount = await db.candidate.count({
      where: whereClause
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Fetch candidates with search results
    const candidates = await db.candidate.findMany({
      where: whereClause,
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        voter: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            contactNum: true,
            votingScope: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        position: {
          select: {
            id: true,
            name: true,
            voteLimit: true,
            numOfWinners: true,
            order: true
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        },
        _count: {
          select: {
            voteResponses: true
          }
        }
      },
      orderBy: [
        { position: { order: 'asc' } },
        { voter: { lastName: 'asc' } },
        { voter: { firstName: 'asc' } }
      ],
      skip: offset,
      take: limit
    });

    // Get available filters for the frontend
    const availableFilters = await Promise.all([
      // Get positions in this election
      db.position.findMany({
        where: {
          electionId: electionIdInt,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          order: true,
          _count: {
            select: {
              candidates: true
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }),
      // Get parties in this election
      db.party.findMany({
        where: {
          electionId: electionIdInt,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          color: true,
          _count: {
            select: {
              candidates: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      }),
      // Get independent candidates count
      db.candidate.count({
        where: {
          electionId: electionIdInt,
          isDeleted: false,
          partyId: null
        }
      })
    ]);

    const [positions, parties, independentCount] = availableFilters;

    // Create audit log for search
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "CANDIDATE",
      resourceId: electionIdInt,
      message: `Searched candidates in election: ${election.name}${query ? ` with query: "${query}"` : ''}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate search completed successfully",
      data: {
        candidates,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          searchQuery: query || '',
          appliedFilters: {
            positionId: positionId ? parseInt(positionId) : null,
            partyId: partyId === 'independent' ? 'independent' : (partyId ? parseInt(partyId) : null),
            hasImage: hasImage ? hasImage === 'true' : null,
            hasBio: hasBio ? hasBio === 'true' : null,
            hasExperience: hasExperience ? hasExperience === 'true' : null
          },
          availableFilters: {
            positions: positions.map(p => ({
              id: p.id,
              name: p.name,
              candidateCount: p._count.candidates
            })),
            parties: [
              ...parties.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                candidateCount: p._count.candidates
              })),
              {
                id: 'independent',
                name: 'Independent',
                color: null,
                candidateCount: independentCount
              }
            ]
          }
        },
        election: {
          id: election.id,
          name: election.name,
          status: election.status
        },
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Candidate search error:", error);
    return apiResponse({
      success: false,
      message: "Failed to search candidates",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
