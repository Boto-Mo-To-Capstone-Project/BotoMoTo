import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { candidateSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS, FILE_LIMITS, ALLOWED_FILE_TYPES } from "@/lib/constants";
import { extname } from 'path';
import { requireAuth } from "@/lib/helpers/requireAuth";

// Import storage system (replaces fs operations)
import { uploadFile, generatePublicUrl, generatePresignedUrl, generateObjectKey } from "@/lib/storage";


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

    // Parse request body - check if it's JSON (batch) or FormData (single)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON request - handle batch import
      const body = await request.json();
      
      // Check if this is batch creation (candidates array) 
      if (body.candidates && Array.isArray(body.candidates)) {
        return handleBatchCandidateImport(body.candidates, body.electionId, user, request);
      } else {
        return apiResponse({ 
          success: false, 
          message: "JSON requests must include candidates array for batch import", 
          error: "Bad Request", 
          status: 400 
        });
      }
    } else {
      // FormData request - handle single candidate creation
      return handleSingleCandidateCreation(request, user);
    }

  } catch (error) {
    console.error("Candidate creation error:", error);
    return apiResponse({ success: false, message: "Failed to create candidate", error: typeof error === "string" ? error : "Internal server error", status: 500 });
  }
}

// Handle single candidate creation via FormData
async function handleSingleCandidateCreation(request: NextRequest, user: any) {
  const formData = await request.formData();
  
  // Extract form fields
  const electionId = formData.get('electionId') as string;
  const voterId = formData.get('voterId') as string;
  const positionId = formData.get('positionId') as string;
  const partyId = formData.get('partyId') as string;

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

  // File upload handling with new storage system
  let imageObjectKey: string | null = null;
  let imageProvider: string | null = null;
  let credentialObjectKey: string | null = null;
  let credentialProvider: string | null = null;

  if (imageFile && imageFile.size > 0) {
    // Validate image file
    if (!(ALLOWED_FILE_TYPES.IMAGES as readonly string[]).includes(imageFile.type)) {
      return apiResponse({
        success: false,
        message: "Invalid image file type. Only images are allowed.",
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

    // Generate standardized object key for image
    const imageKey = generateObjectKey('candidates', candidateData.voterId, 'image', imageFile.name);
    
    // Convert file to buffer
    const imageBuffer = await imageFile.arrayBuffer();
    
    // Upload image with automatic S3 + local fallback
    const imageUpload = await uploadFile(Buffer.from(imageBuffer), imageKey, {
      contentType: imageFile.type,
      isPublic: true, // Candidate images are public
      metadata: { 
        userId: user.id.toString(),
        originalName: imageFile.name,
        uploadType: 'candidate_image',
        electionId: candidateData.electionId.toString(),
        voterId: candidateData.voterId.toString()
      }
    });

    imageObjectKey = imageUpload.key;
    imageProvider = imageUpload.provider;
  }

  if (credentialsFile && credentialsFile.size > 0) {
    // Validate credentials file
    if (credentialsFile.type !== ALLOWED_FILE_TYPES.PDF[0]) {
      return apiResponse({
        success: false,
        message: "Invalid credentials file type. Only PDF files are allowed.",
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

    // Generate standardized object key for credentials
    const credentialKey = generateObjectKey('candidates', candidateData.voterId, 'credentials', credentialsFile.name);
    
    // Convert file to buffer
    const credentialBuffer = await credentialsFile.arrayBuffer();
    
    // Upload credentials with automatic S3 + local fallback
    const credentialUpload = await uploadFile(Buffer.from(credentialBuffer), credentialKey, {
      contentType: credentialsFile.type,
      isPublic: false, // Credentials are private
      metadata: { 
        userId: user.id.toString(),
        originalName: credentialsFile.name,
        uploadType: 'candidate_credentials',
        electionId: candidateData.electionId.toString(),
        voterId: candidateData.voterId.toString()
      }
    });

    credentialObjectKey = credentialUpload.key;
    credentialProvider = credentialUpload.provider;
  }

  // Log which provider was used (for monitoring)
  if (imageObjectKey || credentialObjectKey) {
    console.log(`📤 Candidate files uploaded - Image: ${imageProvider || 'none'}, Credentials: ${credentialProvider || 'none'}`);
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
    // Generate URLs from object keys for database storage (backward compatibility)
    let imageUrl: string | null = null;
    let credentialUrl: string | null = null;

    if (imageObjectKey && imageProvider) {
      imageUrl = generatePublicUrl(imageObjectKey, imageProvider);
    }

    if (credentialObjectKey && credentialProvider) {
      // For credentials, generate a presigned URL that's valid for 1 year for backward compatibility
      credentialUrl = await generatePresignedUrl(credentialObjectKey, 365 * 24 * 3600, credentialProvider);
    }

    const newCandidate = await tx.candidate.create({
      data: {
        electionId: data.electionId,
        voterId: data.voterId,
        positionId: data.positionId,
        partyId: data.partyId || null,
        imageUrl: imageUrl,
        credentialUrl: credentialUrl,
      }
    });

    return newCandidate;
  });

  // Fetch the complete candidate data
  const completeCandidate = await db.candidate.findUnique({
    where: { id: candidate.id },
    select: {
      id: true,
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
}

// Handle batch candidate import from CSV data
async function handleBatchCandidateImport(candidatesData: any[], electionId: number, user: any, request: NextRequest) {
  if (!candidatesData || !Array.isArray(candidatesData) || candidatesData.length === 0) {
    return apiResponse({ 
      success: false, 
      message: "Candidates data is required for batch import", 
      error: "Bad Request", 
      status: 400 
    });
  }

  if (!electionId) {
    return apiResponse({ 
      success: false, 
      message: "Election ID is required", 
      error: "Bad Request", 
      status: 400 
    });
  }

  const electionIdInt = parseInt(String(electionId));
  if (isNaN(electionIdInt)) {
    return apiResponse({ 
      success: false, 
      message: "Invalid election ID", 
      error: "Bad Request", 
      status: 400 
    });
  }

  // Verify election exists and user has access
  const election = await db.election.findUnique({
    where: {
      id: electionIdInt,
      isDeleted: false,
    },
    include: {
      organization: {
        select: {
          id: true,
          adminId: true,
          status: true,
          name: true,
        },
      },
    },
  });

  if (!election) {
    return apiResponse({ 
      success: false, 
      message: "Election not found or has been deleted", 
      error: "Not Found", 
      status: 404 
    });
  }

  // Check if admin owns this election
  if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
    return apiResponse({ 
      success: false, 
      message: "You can only create candidates for your organization's elections", 
      error: "Forbidden", 
      status: 403 
    });
  }

  // Check organization status
  if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
    return apiResponse({ 
      success: false, 
      message: "Only approved organizations can create candidates", 
      error: "Forbidden", 
      status: 403 
    });
  }

  // Validate that each candidate has required fields
  const invalidCandidates = candidatesData.filter((c, idx) => 
    !c.email || !c.position
  );

  if (invalidCandidates.length > 0) {
    return apiResponse({ 
      success: false, 
      message: "All candidates must have email and position", 
      error: "Bad Request", 
      status: 400 
    });
  }

  // Extract unique emails and position names to query the database
  const emails = [...new Set(candidatesData.map(c => c.email.toLowerCase().trim()))];
  const positionNames = [...new Set(candidatesData.map(c => c.position.toLowerCase().trim()))];
  const partyNames = [...new Set(candidatesData.map(c => c.partylist?.toLowerCase().trim()).filter(Boolean))];

  // Find voters by email in this election
  const voters = await db.voter.findMany({
    where: {
      electionId: electionIdInt,
      email: { in: emails, mode: 'insensitive' },
      isDeleted: false
    },
    select: { id: true, firstName: true, lastName: true, email: true }
  });

  // Find positions by name in this election
  const positions = await db.position.findMany({
    where: {
      electionId: electionIdInt,
      name: { in: positionNames, mode: 'insensitive' },
      isDeleted: false
    },
    select: { id: true, name: true }
  });

  // Find parties by name in this election (if any)
  const parties = partyNames.length > 0 ? await db.party.findMany({
    where: {
      electionId: electionIdInt,
      name: { in: partyNames, mode: 'insensitive' },
      isDeleted: false
    },
    select: { id: true, name: true }
  }) : [];

  // Create lookup maps
  const voterByEmail = new Map(voters.filter(v => v.email).map(v => [v.email!.toLowerCase(), v]));
  const positionByName = new Map(positions.map(p => [p.name.toLowerCase(), p]));
  const partyByName = new Map(parties.map(p => [p.name.toLowerCase(), p]));

  // Process candidates and collect errors
  const validatedCandidates: any[] = [];
  const errors: Array<{ index: number; error: string; candidateEmail?: string }> = [];

  for (let i = 0; i < candidatesData.length; i++) {
    const candidate = candidatesData[i];
    const candidateEmail = candidate.email;
    
    // Find voter by email
    const voter = voterByEmail.get(candidate.email.toLowerCase().trim());
    if (!voter) {
      errors.push({
        index: i,
        candidateEmail,
        error: `Voter with email "${candidate.email}" not found in this election`
      });
      continue;
    }

    // Find position by name
    const position = positionByName.get(candidate.position.toLowerCase().trim());
    if (!position) {
      errors.push({
        index: i,
        candidateEmail,
        error: `Position "${candidate.position}" not found in this election`
      });
      continue;
    }

    // Find party by name (optional)
    let party = null;
    if (candidate.partylist && candidate.partylist.trim()) {
      party = partyByName.get(candidate.partylist.toLowerCase().trim());
      // Party not found is not an error, we'll make them independent
    }

    validatedCandidates.push({
      electionId: electionIdInt,
      voterId: voter.id,
      positionId: position.id,
      partyId: party?.id || null,
      voterEmail: voter.email, // For logging
      candidateEmail,
      positionName: position.name,
      partyName: party?.name || 'Independent'
    });
  }

  if (errors.length > 0) {
    return apiResponse({ 
      success: false, 
      message: "Some candidates could not be processed", 
      data: { errors }, 
      error: "Bad Request", 
      status: 400 
    });
  }

  // Check for duplicate voterIds within the validated batch
  const voterIds = validatedCandidates.map(c => c.voterId);
  const duplicateVoterIds = voterIds.filter((id, i) => voterIds.indexOf(id) !== i);
  if (duplicateVoterIds.length > 0) {
    return apiResponse({ 
      success: false, 
      message: "Duplicate candidates found in CSV (same voter assigned to multiple positions)", 
      data: { duplicateVoterIds: Array.from(new Set(duplicateVoterIds)) }, 
      error: "Bad Request", 
      status: 400 
    });
  }

  // Check for existing candidates (both active and soft-deleted)
  const existingCandidates = await db.candidate.findMany({
    where: {
      electionId: electionIdInt,
      voterId: { in: voterIds },
    },
    select: { 
      voterId: true,
      isDeleted: true,
      voter: { select: { firstName: true, lastName: true, email: true } }
    },
  });

  // Separate active candidates from soft-deleted ones
  const activeCandidates = existingCandidates.filter(c => !c.isDeleted);
  const softDeletedCandidates = existingCandidates.filter(c => c.isDeleted);

  if (activeCandidates.length > 0) {
    return apiResponse({
      success: false,
      message: "Some voters are already active candidates in this election",
      data: { 
        existingCandidates: activeCandidates.map(c => ({
          voterId: c.voterId,
          name: `${c.voter.firstName} ${c.voter.lastName}`.trim(),
          email: c.voter.email
        }))
      },
      error: "Conflict",
      status: 409,
    });
  }

  // Create lookup for soft-deleted candidates
  const softDeletedVoterIds = new Set(softDeletedCandidates.map(c => c.voterId));

  // Create candidates in a transaction
  const createdCandidates = await db.$transaction(async (tx) => {
    let restoredCount = 0;
    let createdCount = 0;

    // First, restore soft-deleted candidates
    if (softDeletedVoterIds.size > 0) {
      const candidatesToRestore = validatedCandidates.filter(c => softDeletedVoterIds.has(c.voterId));
      
      for (const candidate of candidatesToRestore) {
        await tx.candidate.updateMany({
          where: {
            electionId: electionIdInt,
            voterId: candidate.voterId,
            isDeleted: true
          },
          data: {
            positionId: candidate.positionId,
            partyId: candidate.partyId,
            isDeleted: false,
            deletedAt: null,
            updatedAt: new Date()
          }
        });
        restoredCount++;
      }
    }

    // Then, create new candidates for voters who were never candidates
    const newCandidates = validatedCandidates.filter(c => !softDeletedVoterIds.has(c.voterId));
    if (newCandidates.length > 0) {
      const toCreate = newCandidates.map(c => ({
        electionId: c.electionId,
        voterId: c.voterId,
        positionId: c.positionId,
        partyId: c.partyId,
        imageUrl: null,
        credentialUrl: null,
      }));

      const created = await tx.candidate.createMany({ data: toCreate });
      createdCount = created.count;
    }

    // Fetch all candidates for response (both restored and newly created)
    const allCandidates = await tx.candidate.findMany({
      where: { 
        electionId: electionIdInt, 
        voterId: { in: voterIds }, 
        isDeleted: false 
      },
      select: {
        id: true,
        electionId: true,
        voter: { select: { id: true, firstName: true, lastName: true, email: true } },
        position: { select: { id: true, name: true } },
        party: { select: { id: true, name: true, color: true } },
      },
    });

    return { 
      count: restoredCount + createdCount, 
      candidates: allCandidates,
      restoredCount,
      createdCount
    };
  });

  const audit = await createAuditLog({
    user,
    action: "CREATE",
    request,
    resource: "CANDIDATE",
    resourceId: electionIdInt,
    newData: { 
      totalCount: createdCandidates.count,
      createdCount: createdCandidates.createdCount,
      restoredCount: createdCandidates.restoredCount,
      importType: 'CSV',
      candidateEmails: validatedCandidates.map(c => c.candidateEmail)
    },
    message: `Batch imported ${createdCandidates.count} candidates for election: ${election.name} (${createdCandidates.createdCount} new, ${createdCandidates.restoredCount} restored)`,
  });

  return apiResponse({
    success: true,
    message: `Successfully imported ${createdCandidates.count} candidates (${createdCandidates.createdCount} new, ${createdCandidates.restoredCount} restored)`,
    data: { 
      candidates: createdCandidates.candidates,
      summary: {
        total: createdCandidates.count,
        created: createdCandidates.createdCount,
        restored: createdCandidates.restoredCount,
        byPosition: validatedCandidates.reduce((acc, c) => {
          acc[c.positionName] = (acc[c.positionName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byParty: validatedCandidates.reduce((acc, c) => {
          acc[c.partyName] = (acc[c.partyName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      audit,
    },
    status: 201,
  });
}
