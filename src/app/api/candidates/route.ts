import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { candidateSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS, FILE_LIMITS } from "@/lib/constants";
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { requireAuth } from "@/lib/helpers/requireAuth";


// Handle GET request to fetch candidates
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Get query parameters
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const positionId = url.searchParams.get('positionId');
    const partyId = url.searchParams.get('partyId');
    const votingScopeId = url.searchParams.get('votingScopeId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const search = url.searchParams.get('search');
    const sortCol = url.searchParams.get('sortCol');
    const sortDir = url.searchParams.get('sortDir') || 'asc';

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

    // Normalize search like positions API
    const searchLower = search ? search.toLowerCase() : undefined;

    // Build base where clause for filtering (no search for count)
    const baseWhere: any = {
      electionId: electionIdInt,
      isDeleted: false,
      ...(positionId && !isNaN(parseInt(positionId)) && { positionId: parseInt(positionId) }),
      ...(partyId && !isNaN(parseInt(partyId)) && { partyId: parseInt(partyId) }),
      ...(votingScopeId && !isNaN(parseInt(votingScopeId)) && {
        position: { is: { votingScopeId: parseInt(votingScopeId) } }
      })
    };

    // Build where clause with search (for findMany)
    const whereWithSearch: any = {
      ...baseWhere,
      ...(searchLower && {
        voter: {
          is: {
            OR: [
              { firstName: { contains: searchLower } },
              { lastName: { contains: searchLower } },
              { email: { contains: searchLower } }
            ]
          }
        }
      })
    };

    // Get total count for pagination
    const totalCount = await db.candidate.count({
      where: searchLower
        ? {
            ...baseWhere,
            voter: {
              is: {
                OR: [
                  { firstName: { contains: searchLower } },
                  { lastName: { contains: searchLower } },
                  { email: { contains: searchLower } }
                ]
              }
            }
          }
        : baseWhere
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Build dynamic orderBy clause
    let orderBy: any[] = [];
    if (sortCol && ['firstName', 'lastName', 'email', 'position', 'party', 'scope'].includes(sortCol)) {
      switch (sortCol) {
        case 'firstName':
          orderBy = [{ voter: { firstName: sortDir } }];
          break;
        case 'lastName':
          orderBy = [{ voter: { lastName: sortDir } }];
          break;
        case 'email':
          orderBy = [{ voter: { email: sortDir } }];
          break;
        case 'position':
          orderBy = [{ position: { name: sortDir } }];
          break;
        case 'party':
          orderBy = [{ party: { name: sortDir } }];
          break;
        case 'scope':
          orderBy = [{ voter: { votingScope: { name: sortDir } } }];
          break;
        default:
          orderBy = [
            { position: { order: 'asc' } },
            { voter: { lastName: 'asc' } },
            { voter: { firstName: 'asc' } }
          ];
          break;
      }
    } else {
      orderBy = [
        { position: { order: 'asc' } },
        { voter: { lastName: 'asc' } },
        { voter: { firstName: 'asc' } }
      ];
    }

    // Fetch candidates with related data
    const candidates = await db.candidate.findMany({
      where: whereWithSearch,
      select: {
        id: true,
        isNew: true,
        imageUrl: true,
        credentialUrl: true,
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
                name: true
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
      orderBy,
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
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    // Parse multipart form data
    const formData = await request.formData();
    
    // Extract form fields
    const electionId = formData.get('electionId') as string;
    const voterId = formData.get('voterId') as string;
    const positionId = formData.get('positionId') as string;
    const partyId = formData.get('partyId') as string;
    const isNew = formData.get('isNew') as string;
  
    // Handle file uploads
    const imageFile = formData.get('image') as File | null;
    const credentialsFile = formData.get('credentials') as File | null;

    // Validate required fields
    if (!electionId || !voterId || !positionId) {
      return apiResponse({ 
        success: false, 
        message: "Election ID, Voter ID, and Position ID are required", 
        error: "Bad Request", 
        status: 400 
      });
    }

    // Convert string values to appropriate types
    const candidateData = {
      electionId: parseInt(electionId),
      voterId: parseInt(voterId),
      positionId: parseInt(positionId),
      partyId: partyId && partyId !== 'null' ? parseInt(partyId) : null,
      isNew: isNew === 'true'
    };

    // Validate numeric conversions
    if (isNaN(candidateData.electionId) || isNaN(candidateData.voterId) || isNaN(candidateData.positionId)) {
      return apiResponse({ 
        success: false, 
        message: "Invalid ID format provided", 
        error: "Bad Request", 
        status: 400 
      });
    }

    if (candidateData.partyId && isNaN(candidateData.partyId)) {
      return apiResponse({ 
        success: false, 
        message: "Invalid party ID format", 
        error: "Bad Request", 
        status: 400 
      });
    }

    // File upload handling
    let imageUrl: string | null = null;
    let credentialUrl: string | null = null;

    if (imageFile && imageFile.size > 0) {
      // Validate image file
      const imageExt = extname(imageFile.name).toLowerCase();
      const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!allowedImageExtensions.includes(imageExt)) {
        return apiResponse({
          success: false,
          message: `Invalid image file type. Allowed extensions: ${allowedImageExtensions.join(', ')}`,
          error: "Bad Request",
          status: 400
        });
      }

      if (imageFile.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        return apiResponse({
          success: false,
          message: `Image file too large. Maximum size: ${FILE_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB`,
          error: "Bad Request",
          status: 400
        });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'candidates', 'images');
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const imageFileName = `${timestamp}-${Math.random().toString(36).substring(2)}${imageExt}`;
      const imagePath = join(uploadsDir, imageFileName);

      // Save image file
      const imageBytes = await imageFile.arrayBuffer();
      await writeFile(imagePath, Buffer.from(imageBytes));

      imageUrl = `/uploads/candidates/images/${imageFileName}`;
    }

    if (credentialsFile && credentialsFile.size > 0) {
      // Validate credentials file
      const credentialsExt = extname(credentialsFile.name).toLowerCase();
      const allowedDocumentExtensions = ['.pdf'];
      if (!allowedDocumentExtensions.includes(credentialsExt)) {
        return apiResponse({
          success: false,
          message: `Invalid credentials file type. Allowed extensions: ${allowedDocumentExtensions.join(', ')}`,
          error: "Bad Request",
          status: 400
        });
      }

      if (credentialsFile.size > FILE_LIMITS.PDF_MAX_SIZE) {
        return apiResponse({
          success: false,
          message: `Credentials file too large. Maximum size: ${FILE_LIMITS.PDF_MAX_SIZE / (1024 * 1024)}MB`,
          error: "Bad Request",
          status: 400
        });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'candidates', 'credentials');
      await mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const credentialsFileName = `${timestamp}-${Math.random().toString(36).substring(2)}${credentialsExt}`;
      const credentialsPath = join(uploadsDir, credentialsFileName);

      // Save credentials file
      const credentialsBytes = await credentialsFile.arrayBuffer();
      await writeFile(credentialsPath, Buffer.from(credentialsBytes));

      credentialUrl = `/uploads/candidates/credentials/${credentialsFileName}`;
    }
    
    // Validate request body
    const validation = validateWithZod(candidateSchema, candidateData);
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
          imageUrl: imageUrl,
          credentialUrl: credentialUrl,
          isNew: data.isNew || false
        }
      });

      return newCandidate;
    });

    // Fetch the complete candidate data
    const completeCandidate = await db.candidate.findUnique({
      where: { id: candidate.id },
      select: {
        id: true,
        isNew: true,
        imageUrl: true,
        credentialUrl: true,
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
        }
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
