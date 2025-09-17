import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { candidateUpdateSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS, ALLOWED_FILE_TYPES, FILE_LIMITS } from "@/lib/constants";
import { requireAuth } from "@/lib/helpers/requireAuth";
import { uploadFile, generateObjectKey } from "@/lib/storage";

// Handle GET request to fetch a specific candidate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const candidateId = parseInt(id);
    if (isNaN(candidateId)) {
      return apiResponse({
        success: false,
        message: "Invalid candidate ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch candidate with full details
    const candidate = await db.candidate.findUnique({
      where: {
        id: candidateId,
        isDeleted: false
      },
      select: {
        id: true,
        electionId: true,
        imageObjectKey: true,
        imageProvider: true,
        credentialObjectKey: true,
        credentialProvider: true,
        createdAt: true,
        updatedAt: true,
        voter: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            votingScope: {
              select: {
                id: true,
                name: true,
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
            order: true,
            votingScope: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        },
        election: {
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
        },
        _count: {
          select: {
            voteResponses: true
          }
        }
      }
    });

    if (!candidate) {
      return apiResponse({
        success: false,
        message: "Candidate not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election or if it's a voter with access
    if (user.role === ROLES.ADMIN && candidate.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "CANDIDATE",
      resourceId: candidate.id,
      message: `Viewed candidate: ${candidate.voter.lastName}, ${candidate.voter.firstName}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate fetched successfully",
      data: { candidate, audit },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Candidate fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch candidate",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a candidate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const candidateId = parseInt(id);
    if (isNaN(candidateId)) {
      return apiResponse({
        success: false,
        message: "Invalid candidate ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check content type to determine if this is JSON or FormData
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    let data: any;
    let imageFile: File | null = null;
    let credentialsFile: File | null = null;

    if (isFormData) {
      // Handle FormData (with file uploads)
      const formData = await request.formData();
      
      // Extract form fields
      const positionId = formData.get('positionId') as string;
      const partyId = formData.get('partyId') as string;
      imageFile = formData.get('image') as File | null;
      credentialsFile = formData.get('credentials') as File | null;

      // Build data object
      data = {
        positionId: positionId ? parseInt(positionId) : undefined,
        partyId: partyId && partyId !== 'null' ? parseInt(partyId) : null,
      };

      // Validate FormData fields
      if (data.positionId && isNaN(data.positionId)) {
        return apiResponse({
          success: false,
          message: "Invalid position ID format",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      if (data.partyId && isNaN(data.partyId)) {
        return apiResponse({
          success: false,
          message: "Invalid party ID format",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    } else {
      // Handle JSON (no file uploads)
      const body = await request.json();

      // Validate request body
      const validation = validateWithZod(candidateUpdateSchema, body);
      if (!('data' in validation)) return validation;

      data = validation.data;
    }

    // Check if candidate exists
    const existingCandidate = await db.candidate.findUnique({
      where: {
        id: candidateId,
        isDeleted: false
      },
      select: {
        id: true,
        electionId: true,
        voterId: true,
        positionId: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        election: {
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
        }
      }
    });

    if (!existingCandidate) {
      return apiResponse({
        success: false,
        message: "Candidate not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && existingCandidate.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (existingCandidate.election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Verify position exists if changing position
    if (data.positionId && data.positionId !== existingCandidate.positionId) {
      const position = await db.position.findUnique({
        where: {
          id: data.positionId,
          electionId: existingCandidate.electionId,
          isDeleted: false
        }
      });

      if (!position) {
        return apiResponse({
          success: false,
          message: "Position not found in this election or has been deleted",
          data: null,
          error: "Not Found",
          status: 404
        });
      }
    }

    // Verify party exists if changing party
    if (data.partyId) {
      const party = await db.party.findUnique({
        where: {
          id: data.partyId,
          electionId: existingCandidate.electionId,
          isDeleted: false
        }
      });

      if (!party) {
        return apiResponse({
          success: false,
          message: "Party not found in this election or has been deleted",
          data: null,
          error: "Not Found",
          status: 404
        });
      }
    }

    // Handle file uploads if present (FormData only)
    let imageObjectKey: string | null | undefined = data.imageObjectKey;
    let imageProvider: string | null | undefined = data.imageProvider;
    let credentialObjectKey: string | null | undefined = data.credentialObjectKey;
    let credentialProvider: string | null | undefined = data.credentialProvider;

    if (imageFile && imageFile.size > 0) {
      // Validate image file
      if (!(ALLOWED_FILE_TYPES.IMAGES as readonly string[]).includes(imageFile.type)) {
        return apiResponse({
          success: false,
          message: "Invalid image file type. Only images are allowed.",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      if (imageFile.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        return apiResponse({
          success: false,
          message: `Image file too large. Maximum size: ${FILE_LIMITS.IMAGE_MAX_SIZE / (1024 * 1024)}MB`,
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      // Generate standardized object key for image using organization owner's user ID
      const imageKey = generateObjectKey('candidates', user.id, 'image', imageFile.name);
      
      // Convert file to buffer
      const imageBuffer = await imageFile.arrayBuffer();
      
      // Upload image with automatic S3 + local fallback
      const imageUpload = await uploadFile(Buffer.from(imageBuffer), imageKey, {
        contentType: imageFile.type,
        isPublic: true // Candidate images are public
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
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      if (credentialsFile.size > FILE_LIMITS.PDF_MAX_SIZE) {
        return apiResponse({
          success: false,
          message: `Credentials file too large. Maximum size: ${FILE_LIMITS.PDF_MAX_SIZE / (1024 * 1024)}MB`,
          data: null,
          error: "Bad Request",
          status: 400
        });
      }

      // Generate standardized object key for credentials
      const credentialKey = generateObjectKey('candidates', user.id, 'credentials', credentialsFile.name);
      
      // Convert file to buffer
      const credentialBuffer = await credentialsFile.arrayBuffer();
      
      // Upload credentials with automatic S3 + local fallback
      const credentialUpload = await uploadFile(Buffer.from(credentialBuffer), credentialKey, {
        contentType: credentialsFile.type,
        isPublic: false // Credentials are private
      });

      credentialObjectKey = credentialUpload.key;
      credentialProvider = credentialUpload.provider;
    }

    // Log which provider was used (for monitoring)
    if (imageFile || credentialsFile) {
      console.log(`📤 Candidate files updated - Image: ${imageProvider || 'none'}, Credentials: ${credentialProvider || 'none'}`);
    }

    // Update candidate with experiences
    const updatedCandidate = await db.$transaction(async (tx) => {
      // Update main candidate record
      const candidate = await tx.candidate.update({
        where: { id: candidateId },
        data: {
          positionId: data.positionId || existingCandidate.positionId,
          partyId: data.partyId !== undefined ? data.partyId : undefined,
          imageObjectKey: imageObjectKey !== undefined ? imageObjectKey : undefined,
          imageProvider: imageProvider !== undefined ? imageProvider : undefined,
          credentialObjectKey: credentialObjectKey !== undefined ? credentialObjectKey : undefined,
          credentialProvider: credentialProvider !== undefined ? credentialProvider : undefined,
          updatedAt: new Date()
        }
      });

      return candidate;
    });

    // Fetch the complete updated candidate data
    const completeCandidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        imageObjectKey: true,
        imageProvider: true,
        credentialObjectKey: true,
        credentialProvider: true,
        createdAt: true,
        updatedAt: true,
        voter: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
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
      action: "UPDATE",
      request,
      resource: "CANDIDATE",
      resourceId: candidateId,
      message: `Updated candidate: ${existingCandidate.voter.firstName} ${existingCandidate.voter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate updated successfully",
      data: {
        candidate: completeCandidate,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Candidate update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update candidate",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to remove a candidate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const candidateId = parseInt(id);
    if (isNaN(candidateId)) {
      return apiResponse({
        success: false,
        message: "Invalid candidate ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if candidate exists
    const candidate = await db.candidate.findUnique({
      where: {
        id: candidateId,
        isDeleted: false
      },
      select: {
        id: true,
        electionId: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        election: {
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
        },
        _count: {
          select: {
            voteResponses: true
          }
        }
      }
    });

    if (!candidate) {
      return apiResponse({
        success: false,
        message: "Candidate not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && candidate.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (candidate.election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if candidate has votes (prevent deletion if votes exist)
    if (candidate._count.voteResponses > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete candidate who has received votes. Consider archiving instead.",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Soft delete the candidate
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "CANDIDATE",
      resourceId: candidateId,
      message: `Deleted candidate: ${candidate.voter.firstName} ${candidate.voter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate deleted successfully",
      data: {
        candidateId,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Candidate deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete candidate",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
