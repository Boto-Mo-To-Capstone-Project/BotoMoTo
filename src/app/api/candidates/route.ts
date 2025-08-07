import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { candidateSchema, candidateUpdateSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

// Handle GET request to fetch candidates
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    // Check if user is authenticated
    if (!user) {
      return apiResponse({ success: false, message: "You must be logged in to view candidates", error: "Unauthorized", status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const positionId = url.searchParams.get('positionId');
    const partyId = url.searchParams.get('partyId');
    const votingScopeId = url.searchParams.get('votingScopeId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const search = url.searchParams.get('search');

    if (!electionId) {
      return apiResponse({ success: false, message: "Election ID is required", error: "Bad Request", status: 400 });
    }

    const electionIdInt = parseInt(electionId);
    if (isNaN(electionIdInt)) {
      return apiResponse({ success: false, message: "Invalid election ID", error: "Bad Request", status: 400 });
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
            name: true,
            status: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({ success: false, message: "Election not found or has been deleted", error: "Not Found", status: 404 });
    }

    // Check if admin owns this election or if it's a voter with access
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({ success: false, message: "You can only view candidates from your organization's elections", error: "Forbidden", status: 403 });
    }

    // Build where clause for filtering
    const whereClause: any = {
      electionId: electionIdInt,
      isDeleted: false
    };

    if (positionId) {
      const positionIdInt = parseInt(positionId);
      if (!isNaN(positionIdInt)) {
        whereClause.positionId = positionIdInt;
      }
    }

    if (partyId) {
      const partyIdInt = parseInt(partyId);
      if (!isNaN(partyIdInt)) {
        whereClause.partyId = partyIdInt;
      }
    }

    if (votingScopeId) {
      const votingScopeIdInt = parseInt(votingScopeId);
      if (!isNaN(votingScopeIdInt)) {
        whereClause.position = {
          votingScopeId: votingScopeIdInt
        };
      }
    }

    // Add search functionality
    if (search) {
      whereClause.voter = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Get total count for pagination
    const totalCount = await db.candidate.count({
      where: whereClause
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Fetch candidates with related data
    const candidates = await db.candidate.findMany({
      where: whereClause,
      select: {
        id: true,
        isNew: true,
        imageUrl: true,
        bio: true,
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
            address: true,
            votingScope: {
              select: {
                id: true,
                name: true,
                type: true
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
            logoUrl: true
          }
        },
        leaderships: {
          select: {
            id: true,
            organization: true,
            position: true,
            dateRange: true,
            description: true
          }
        },
        workExps: {
          select: {
            id: true,
            company: true,
            role: true,
            dateRange: true,
            description: true
          }
        },
        educations: {
          select: {
            id: true,
            school: true,
            educationLevel: true,
            dateRange: true,
            description: true
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

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "CANDIDATE",
      resourceId: electionIdInt,
      message: `Viewed candidates for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Candidates fetched successfully",
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
        election: {
          id: election.id,
          name: election.name,
          status: election.status
        },
        audit
      },
      status: 200
    });

  } catch (error) {
    console.error("Candidates fetch error:", error);
    return apiResponse({ success: false, message: "Failed to fetch candidates", error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Handle POST request to create a candidate
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({ success: false, message: "You must be logged in to create candidates", error: "Unauthorized", status: 401 });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({ success: false, message: "Only admin users can create candidates", error: "Forbidden", status: 403 });
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateWithZod(candidateSchema, body);
    if (!('data' in validation)) return validation;

    const data = validation.data;

    // Verify election exists and user has access
    const election = await db.election.findUnique({
      where: {
        id: data.electionId,
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
            status: true
          }
        }
      }
    });

    if (!election) {
      return apiResponse({ success: false, message: "Election not found or has been deleted", error: "Not Found", status: 404 });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({ success: false, message: "You can only create candidates for your organization's elections", error: "Forbidden", status: 403 });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({ success: false, message: "Organization must be approved to manage candidates", error: "Forbidden", status: 403 });
    }

    // Verify voter exists and belongs to the election
    const voter = await db.voter.findUnique({
      where: {
        id: data.voterId,
        electionId: data.electionId,
        isDeleted: false
      }
    });

    if (!voter) {
      return apiResponse({ success: false, message: "Voter not found in this election or has been deleted", error: "Not Found", status: 404 });
    }

    // Check if voter is already a candidate
    const existingCandidate = await db.candidate.findUnique({
      where: {
        voterId: data.voterId,
        isDeleted: false
      }
    });

    if (existingCandidate) {
      return apiResponse({ success: false, message: "This voter is already a candidate", error: "Conflict", status: 409 });
    }

    // Verify position exists and belongs to the election
    const position = await db.position.findUnique({
      where: {
        id: data.positionId,
        electionId: data.electionId,
        isDeleted: false
      }
    });

    if (!position) {
      return apiResponse({ success: false, message: "Position not found in this election or has been deleted", error: "Not Found", status: 404 });
    }

    // Verify party exists if provided
    if (data.partyId) {
      const party = await db.party.findUnique({
        where: {
          id: data.partyId,
          electionId: data.electionId,
          isDeleted: false
        }
      });

      if (!party) {
        return apiResponse({ success: false, message: "Party not found in this election or has been deleted", error: "Not Found", status: 404 });
      }
    }

    // Create candidate with related experiences
    const candidate = await db.$transaction(async (tx) => {
      const newCandidate = await tx.candidate.create({
        data: {
          electionId: data.electionId,
          voterId: data.voterId,
          positionId: data.positionId,
          partyId: data.partyId || null,
          imageUrl: data.imageUrl || null,
          bio: data.bio || null,
          isNew: data.isNew || false
        }
      });

      // Create leadership experiences if provided
      if (data.leaderships && data.leaderships.length > 0) {
        await tx.candidateLeadershipExperience.createMany({
          data: data.leaderships.map((leadership: any) => ({
            candidateId: newCandidate.id,
            organization: leadership.organization,
            position: leadership.position,
            dateRange: leadership.dateRange,
            description: leadership.description || null
          }))
        });
      }

      // Create work experiences if provided
      if (data.workExperiences && data.workExperiences.length > 0) {
        await tx.candidateWorkExperience.createMany({
          data: data.workExperiences.map((workExp: any) => ({
            candidateId: newCandidate.id,
            company: workExp.company,
            role: workExp.role,
            dateRange: workExp.dateRange,
            description: workExp.description || null
          }))
        });
      }

      // Create education records if provided
      if (data.educations && data.educations.length > 0) {
        await tx.candidateEducationLevel.createMany({
          data: data.educations.map((education: any) => ({
            candidateId: newCandidate.id,
            school: education.school,
            educationLevel: education.educationLevel,
            dateRange: education.dateRange,
            description: education.description || null
          }))
        });
      }

      return newCandidate;
    });

    // Fetch the complete candidate data
    const completeCandidate = await db.candidate.findUnique({
      where: { id: candidate.id },
      select: {
        id: true,
        isNew: true,
        imageUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        voter: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            contactNum: true
          }
        },
        position: {
          select: {
            id: true,
            name: true
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        leaderships: true,
        workExps: true,
        educations: true
      }
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "CANDIDATE",
      resourceId: candidate.id,
      message: `Created candidate: ${voter.firstName} ${voter.lastName} for position: ${position.name}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate created successfully",
      data: {
        candidate: completeCandidate,
        audit
      },
      status: 201
    });

  } catch (error) {
    console.error("Candidate creation error:", error);
    return apiResponse({ success: false, message: "Failed to create candidate", error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}
