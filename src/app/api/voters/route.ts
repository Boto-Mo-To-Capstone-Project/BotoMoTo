// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { voterSchema, voterBulkUploadSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { generateUniqueVoterCode } from "@/lib/utils";
import { Voter } from "@prisma/client";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Handle GET request to fetch voters
async function getVoters(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const votingScopeId = url.searchParams.get('votingScopeId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const hasVoted = url.searchParams.get('hasVoted');
    const votedParam = url.searchParams.get('voted');
    const isActive = url.searchParams.get('isActive');
    const sortCol = url.searchParams.get('sortCol');
    const sortDir = url.searchParams.get('sortDir') || 'asc';

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

    // Check if election exists and user has permission
    const election = await db.election.findUnique({
      where: {
        id: electionIdInt,
        isDeleted: false
      },
      include: {
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
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check permissions - admin can only view voters from their organization's elections
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Deny access for voters (they shouldn't see other voters)
    if (user.role === ROLES.VOTER) {
      return apiResponse({
        success: false,
        message: "You do not have permission to view voters",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Build query filters
    const where: any = {
      electionId: electionIdInt,
      isDeleted: false
    };

    // Add voting scope filter if provided
    if (votingScopeId) {
      const votingScopeIdInt = parseInt(votingScopeId);
      if (!isNaN(votingScopeIdInt)) {
        where.votingScopeId = votingScopeIdInt;
      }
    }

    // Add hasVoted/voted filter (computed via VoteResponse existence)
    const votedFilter = votedParam ?? hasVoted;
    if (votedFilter !== null && votedFilter !== undefined) {
      const wantsVoted = votedFilter === 'true';
      if (wantsVoted) {
        where.voteResponses = { some: { electionId: electionIdInt } };
      } else {
        where.voteResponses = { none: { electionId: electionIdInt } };
      }
    }

    // Add isActive filter
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Add search filter if provided (remove mode: 'insensitive' to fix Prisma error)
    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        {
          firstName: {
            contains: searchLower
          }
        },
        {
          lastName: {
            contains: searchLower
          }
        },
        {
          middleName: {
            contains: searchLower
          }
        },
        {
          email: {
            contains: searchLower
          }
        },
        {
          code: {
            contains: searchLower
          }
        }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build dynamic orderBy clause
    let orderBy: any[] = [];
    
    if (sortCol && ['name', 'status', 'scope', 'email', 'contactNumber', 'hasVoted', 'voted'].includes(sortCol)) {
      switch (sortCol) {
        case 'name':
          orderBy = [
            { lastName: sortDir },
            { firstName: sortDir }
          ];
          break;
        case 'status':
          orderBy = [{ isActive: sortDir }];
          break;
        case 'scope':
          orderBy = [{ votingScope: { name: sortDir } }];
          break;
        case 'email':
          orderBy = [{ email: sortDir }];
          break;
        case 'contactNumber':
          orderBy = [{ contactNum: sortDir }];
          break;
        case 'hasVoted':
        case 'voted':
          // Sort by whether voter has any voteResponses (treat count > 0 as true)
          orderBy = [{ voteResponses: { _count: sortDir as any } }];
          break;
        default:
          orderBy = [
            { lastName: 'asc' },
            { firstName: 'asc' }
          ];
      }
    } else {
      // Default sorting
      orderBy = [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ];
    }

    // Fetch voters with pagination and search
    const [voters, totalCount] = await Promise.all([
      db.voter.findMany({
        where,
        include: {
          votingScope: {
            select: {
              id: true,
              name: true
            }
          },
          candidate: {
            select: {
              id: true,
              position: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          // Fetch at most 1 vote for computing hasVoted
          voteResponses: {
            where: { electionId: electionIdInt },
            select: { id: true },
            take: 1
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      db.voter.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTER",
      resourceId: electionIdInt,
      message: `Viewed voters for election: ${election.name}`,
    });

    // Compute hasVoted boolean based on presence of voteResponses
    const votersWithComputed = voters.map(v => ({
      ...v,
      voted: (v as any).voteResponses?.length > 0
    }));

    return apiResponse({
      success: true,
      message: "Voters fetched successfully",
      data: {
        voters: votersWithComputed,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voters fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch voters",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle POST request to create a new voter
async function createVoter(request: NextRequest) {
  try {
    // Authenticate the user - only admins can create voters
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse and validate input
    const body = await request.json();
    
    // Check if it's a bulk upload or single voter creation
    if (body.voters && Array.isArray(body.voters)) {
      // Handle bulk upload
      const validation = validateWithZod(voterBulkUploadSchema, body);
      if (!('data' in validation)) return validation;
      
      const { electionId, voters: votersData } = validation.data;

      // Check if election exists and user has permission
      const election = await db.election.findUnique({
        where: {
          id: electionId,
          isDeleted: false
        },
        include: {
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
          message: "Election not found or has been deleted",
          data: null,
          error: "Not Found",
          status: 404
        });
      }

      // Check if admin owns this election (through organization)
      if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
        return apiResponse({
          success: false,
          message: "You can only create voters for your organization's elections",
          data: null,
          error: "Forbidden",
          status: 403
        });
      }

      // Generate unique codes for all voters
      const votersWithCodes = await Promise.all(
        votersData.map(async (voterData: Voter) => ({
          ...voterData,
          electionId,
          code: await generateUniqueVoterCode(),
          codeSendStatus: "PENDING",
          isVerified: false,
          // hasVoted removed; computed from VoteResponse
          isActive: true
        }))
      );

      // Create all voters in a transaction
      const createdVoters = await db.$transaction(async (tx) => {
        const voters: any[] = [];
        for (const voterData of votersWithCodes) {
          const voter = await tx.voter.create({
            data: voterData,
            include: {
              votingScope: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });
          voters.push({ ...voter, voted: false });
        }
        return voters;
      });

      const audit = await createAuditLog({
        user,
        action: "CREATE",
        request,
        resource: "VOTER",
        resourceId: electionId,
        message: `Bulk created ${createdVoters.length} voters for election: ${election.name}`,
      });

      return apiResponse({
        success: true,
        message: `${createdVoters.length} voters created successfully`,
        data: {
          voters: createdVoters,
          audit
        },
        error: null,
        status: 201
      });
    } else {
      // Handle single voter creation
      const validation = validateWithZod(voterSchema, body);
      if (!('data' in validation)) return validation;
      
      const { electionId, email, contactNum, firstName, middleName, lastName, votingScopeId, isActive } = validation.data;

      // Check if election exists and user has permission
      const election = await db.election.findUnique({
        where: {
          id: electionId,
          isDeleted: false
        },
        include: {
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
          message: "Election not found or has been deleted",
          data: null,
          error: "Not Found",
          status: 404
        });
      }

      // Check if admin owns this election (through organization)
      if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
        return apiResponse({
          success: false,
          message: "You can only create voters for your organization's elections",
          data: null,
          error: "Forbidden",
          status: 403
        });
      }

      // Check if voting scope exists (if provided)
      if (votingScopeId) {
        const votingScope = await db.votingScope.findUnique({
          where: {
            id: votingScopeId,
            electionId,
            isDeleted: false
          }
        });

        if (!votingScope) {
          return apiResponse({
            success: false,
            message: "Voting scope not found or doesn't belong to this election",
            data: null,
            error: "Bad Request",
            status: 400
          });
        }
      }

      // Check for duplicate email in the same election (if email is provided)
      if (email) {
        const existingVoterByEmail = await db.voter.findFirst({
          where: {
            electionId,
            email,
            isDeleted: false
          }
        });

        if (existingVoterByEmail) {
          return apiResponse({
            success: false,
            message: "A voter with this email already exists in this election",
            data: null,
            error: "Already exists",
            status: 400
          });
        }
      }

      // Generate unique voter code
      const voterCode = await generateUniqueVoterCode();

      // Create voter
      const newVoter = await db.voter.create({
        data: {
          electionId,
          code: voterCode,
          email,
          contactNum,
          firstName,
          middleName,
          lastName,
          votingScopeId,
          isActive,
          codeSendStatus: "PENDING",
          isVerified: false
          // hasVoted removed; computed from VoteResponse
        },
        include: {
          votingScope: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const audit = await createAuditLog({
        user,
        action: "CREATE",
        request,
        resource: "VOTER",
        resourceId: newVoter.id,
        message: `Created voter: ${firstName} ${lastName} for election: ${election.name}`,
      });

      return apiResponse({
        success: true,
        message: "Voter created successfully",
        data: {
          voter: { ...newVoter, voted: false },
          audit
        },
        error: null,
        status: 201
      });
    }
  } catch (error) {
    console.error("Voter creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create voter(s)",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Apply performance logging middleware to voters endpoints
export const GET = withPerformanceLogging(getVoters as any);
export const POST = withPerformanceLogging(createVoter as any);

/*
PERFORMANCE LOGGING ADDED TO VOTERS API! 🎉

What this captures:
✅ GET /api/voters - Voter listing performance (including filtering/pagination)
✅ POST /api/voters - Voter creation speed (including bulk uploads)

Key metrics for voter management:
- Voter data loading speed (critical for admin UX)
- Bulk voter import performance (CSV uploads)
- Database performance under voter loads
- Peak usage during voter registration periods
*/
