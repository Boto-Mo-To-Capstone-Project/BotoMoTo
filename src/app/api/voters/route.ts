// Import necessary modules and constants
import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { voterSchema, voterBulkUploadSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";
import { generateUniqueVoterCode, generateMultipleUniqueVoterCodes } from "@/lib/utils";
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
    const all = url.searchParams.get('all') === 'true';

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

    // Add search filter if provided
    if (search) {
      const searchTerm = search.trim().toLowerCase();
      
      const searchConditions: any[] = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { middleName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
      ];

      // Handle status-related searches
      if (searchTerm === 'active') {
        searchConditions.push({ isActive: true });
      } else if (searchTerm === 'inactive') {
        searchConditions.push({ isActive: false });
      } else if (searchTerm === 'voted' || searchTerm === 'yes') {
        // Users who have voted
        searchConditions.push({ 
          voteResponses: { some: { electionId: electionIdInt } } 
        });
      } else if (searchTerm === 'not voted' || searchTerm === 'no') {
        // Users who haven't voted
        searchConditions.push({ 
          voteResponses: { none: { electionId: electionIdInt } } 
        });
      }

      where.OR = searchConditions;
    }

    // Calculate pagination (skip if fetching all)
    const skip = all ? 0 : (page - 1) * limit;
    const take = all ? undefined : limit;

    // Default sorting (no frontend sorting parameters needed)
    const orderBy = [
      { lastName: 'asc' as const },
      { firstName: 'asc' as const }
    ];

    // Fetch voters with conditional pagination
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
        ...(take !== undefined && { take })
      }),
      db.voter.count({ where })
    ]);

    const totalPages = all ? 1 : Math.ceil(totalCount / limit);

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTER",
      resourceId: electionIdInt,
      message: `Viewed voters for election: ${election.name}${all ? ' (all voters)' : ''}`,
    });

    // Compute hasVoted boolean based on presence of voteResponses
    const votersWithComputed = voters.map(v => ({
      ...v,
      voted: (v as any).voteResponses?.length > 0
    }));

    // Prepare response data
    const responseData: any = {
      voters: votersWithComputed,
      audit
    };

    // Only include pagination when not fetching all
    if (!all) {
      responseData.pagination = {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } else {
      responseData.totalCount = totalCount;
    }

    return apiResponse({
      success: true,
      message: "Voters fetched successfully",
      data: responseData,
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

      // Generate unique codes for all voters efficiently
      const codes = await generateMultipleUniqueVoterCodes(votersData.length);
      const votersWithCodes = votersData.map((voterData: Voter, index: number) => ({
        ...voterData,
        electionId,
        code: codes[index],
        codeSendStatus: "PENDING",
        isActive: true
      }));

      // Check for existing voters (both active and soft-deleted) by email
      const emails = votersWithCodes.map((v: any) => v.email).filter(Boolean);
      const existingVoters = emails.length > 0 ? await db.voter.findMany({
        where: {
          electionId,
          email: { in: emails }
        },
        select: { email: true, isDeleted: true, id: true }
      }) : [];

      // Create lookup for existing voters
      const existingVotersByEmail = new Map(existingVoters.map(v => [v.email!, v]));

      // Create all voters in optimized batches to prevent transaction timeout
      const CHUNK_SIZE = 100; // Process voters in chunks to avoid timeout
      const createdVoters = await db.$transaction(async (tx) => {
        const voters: any[] = [];
        let createdCount = 0;
        let restoredCount = 0;

        // Process voters in chunks
        for (let i = 0; i < votersWithCodes.length; i += CHUNK_SIZE) {
          const chunk = votersWithCodes.slice(i, i + CHUNK_SIZE);
          
          // Separate new voters from potential restores
          const newVoters: any[] = [];
          const restoreVoters: any[] = [];
          
          for (const voterData of chunk) {
            const existingVoter = voterData.email ? existingVotersByEmail.get(voterData.email) : null;

            if (existingVoter) {
              if (existingVoter.isDeleted) {
                // Prepare for restore
                restoreVoters.push({
                  id: existingVoter.id,
                  data: {
                    isDeleted: false,
                    deletedAt: null,
                    firstName: voterData.firstName,
                    middleName: voterData.middleName,
                    lastName: voterData.lastName,
                    votingScopeId: voterData.votingScopeId,
                    isActive: voterData.isActive,
                    updatedAt: new Date()
                  }
                });
              } else {
                throw new Error(`A voter with email "${voterData.email}" already exists in this election`);
              }
            } else {
              // Prepare for creation
              newVoters.push(voterData);
            }
          }

          // Batch create new voters
          if (newVoters.length > 0) {
            await tx.voter.createMany({
              data: newVoters,
              skipDuplicates: true
            });

            // Fetch created voters with includes
            const createdInChunk = await tx.voter.findMany({
              where: {
                electionId,
                code: { in: newVoters.map(v => v.code) }
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

            voters.push(...createdInChunk.map(v => ({ ...v, voted: false })));
            createdCount += createdInChunk.length;
          }

          // Batch restore voters (individual updates needed due to different data per voter)
          for (const restoreData of restoreVoters) {
            const restoredVoter = await tx.voter.update({
              where: { id: restoreData.id },
              data: restoreData.data,
              include: {
                votingScope: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            });
            voters.push({ ...restoredVoter, voted: false });
            restoredCount++;
          }
        }

        return { voters, createdCount, restoredCount, totalCount: createdCount + restoredCount };
      });

      const audit = await createAuditLog({
        user,
        action: "CREATE",
        request,
        resource: "VOTER",
        resourceId: electionId,
        message: `Batch imported ${createdVoters.totalCount} voters for election: ${election.name} (${createdVoters.createdCount} new, ${createdVoters.restoredCount} restored)`,
      });

      return apiResponse({
        success: true,
        message: `Successfully imported ${createdVoters.totalCount} voters (${createdVoters.createdCount} new, ${createdVoters.restoredCount} restored)`,
        data: {
          voters: createdVoters.voters,
          summary: {
            total: createdVoters.totalCount,
            created: createdVoters.createdCount,
            restored: createdVoters.restoredCount
          },
          audit
        },
        error: null,
        status: 201
      });
    } else {
      // Handle single voter creation
      const validation = validateWithZod(voterSchema, body);
      if (!('data' in validation)) return validation;
      
      const { electionId, email, firstName, middleName, lastName, votingScopeId, isActive } = validation.data;

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

      // Check for duplicate email in the same election (including soft-deleted)
      if (email) {
        const existingVoterByEmail = await db.voter.findFirst({
          where: {
            electionId,
            email,
          }
        });

        if (existingVoterByEmail) {
          if (existingVoterByEmail.isDeleted) {
            // Restore soft-deleted voter
            const restoredVoter = await db.voter.update({
              where: { id: existingVoterByEmail.id },
              data: {
                isDeleted: false,
                deletedAt: null,
                firstName,
                middleName,
                lastName,
                votingScopeId,
                isActive,
                updatedAt: new Date()
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
              action: "RESTORE",
              request,
              resource: "VOTER",
              resourceId: restoredVoter.id,
              message: `Restored voter: ${firstName} ${lastName} for election: ${election.name}`,
            });

            return apiResponse({
              success: true,
              message: "Voter restored successfully",
              data: {
                voter: { ...restoredVoter, voted: false },
                audit
              },
              error: null,
              status: 200
            });
          } else {
            return apiResponse({
              success: false,
              message: "A voter with this email already exists in this election",
              data: null,
              error: "Already exists",
              status: 400
            });
          }
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
          firstName,
          middleName,
          lastName,
          votingScopeId,
          isActive,
          codeSendStatus: "PENDING",
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
