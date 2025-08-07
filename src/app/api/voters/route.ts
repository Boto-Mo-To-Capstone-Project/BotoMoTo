// Import necessary modules and constants
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { voterSchema, voterBulkUploadSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { generateUniqueVoterCode } from "@/lib/utils";
import { Voter } from "@prisma/client";

// Import performance logging middleware
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Handle GET request to fetch voters
async function getVoters(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Get election ID from query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const votingScopeId = url.searchParams.get('votingScopeId');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const hasVoted = url.searchParams.get('hasVoted');
    const isActive = url.searchParams.get('isActive');

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

    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Add hasVoted filter
    if (hasVoted !== null && hasVoted !== undefined) {
      where.hasVoted = hasVoted === 'true';
    }

    // Add isActive filter
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch voters with pagination
    const [voters, totalCount] = await Promise.all([
      db.voter.findMany({
        where,
        include: {
          votingScope: {
            select: {
              id: true,
              name: true,
              type: true
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
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
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

    return apiResponse({
      success: true,
      message: "Voters fetched successfully",
      data: {
        voters,
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
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create voters",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

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
          hasVoted: false,
          isActive: true
        }))
      );

      // Create all voters in a transaction
      const createdVoters = await db.$transaction(async (tx) => {
        const voters = [];
        for (const voterData of votersWithCodes) {
          const voter = await tx.voter.create({
            data: voterData,
            include: {
              votingScope: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          });
          voters.push(voter);
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
      
      const { electionId, email, contactNum, firstName, middleName, lastName, votingScopeId, address, isActive } = validation.data;

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
          address,
          isActive,
          codeSendStatus: "PENDING",
          isVerified: false,
          hasVoted: false
        },
        include: {
          votingScope: {
            select: {
              id: true,
              name: true,
              type: true
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
          voter: newVoter,
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
