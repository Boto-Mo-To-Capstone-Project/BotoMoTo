import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import { candidateUpdateSchema } from "@/lib/schema";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";

// Handle GET request to fetch a specific candidate
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to view candidate details",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    const candidateId = parseInt(params.id);
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
            description: true,
            voteLimit: true,
            numOfWinners: true,
            order: true,
            votingScope: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            color: true,
            logoUrl: true,
            description: true
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
        leaderships: {
          select: {
            id: true,
            organization: true,
            position: true,
            dateRange: true,
            description: true
          },
          orderBy: {
            dateRange: 'desc'
          }
        },
        workExps: {
          select: {
            id: true,
            company: true,
            role: true,
            dateRange: true,
            description: true
          },
          orderBy: {
            dateRange: 'desc'
          }
        },
        educations: {
          select: {
            id: true,
            school: true,
            educationLevel: true,
            dateRange: true,
            description: true
          },
          orderBy: {
            dateRange: 'desc'
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

    // Check if user has access to this candidate
    if (user.role === ROLES.ADMIN && candidate.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "CANDIDATE",
      resourceId: candidateId,
      message: `Viewed candidate details: ${candidate.voter.firstName} ${candidate.voter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: "Candidate details fetched successfully",
      data: {
        candidate,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Candidate fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch candidate details",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a candidate
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to update candidates",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const candidateId = parseInt(params.id);
    if (isNaN(candidateId)) {
      return apiResponse({
        success: false,
        message: "Invalid candidate ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateWithZod(candidateUpdateSchema, body);
    if (!('data' in validation)) return validation;

    const data = validation.data;

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

    // Update candidate with experiences
    const updatedCandidate = await db.$transaction(async (tx) => {
      // Update main candidate record
      const candidate = await tx.candidate.update({
        where: { id: candidateId },
        data: {
          positionId: data.positionId || existingCandidate.positionId,
          partyId: data.partyId !== undefined ? data.partyId : undefined,
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
          bio: data.bio !== undefined ? data.bio : undefined,
          isNew: data.isNew !== undefined ? data.isNew : undefined,
          updatedAt: new Date()
        }
      });

      // Update leadership experiences if provided
      if (data.leaderships !== undefined) {
        // Delete existing leadership records
        await tx.candidateLeadershipExperience.deleteMany({
          where: { candidateId }
        });

        // Create new leadership records
        if (data.leaderships.length > 0) {
          await tx.candidateLeadershipExperience.createMany({
            data: data.leaderships.map((leadership: any) => ({
              candidateId,
              organization: leadership.organization,
              position: leadership.position,
              dateRange: leadership.dateRange,
              description: leadership.description || null
            }))
          });
        }
      }

      // Update work experiences if provided
      if (data.workExperiences !== undefined) {
        // Delete existing work experience records
        await tx.candidateWorkExperience.deleteMany({
          where: { candidateId }
        });

        // Create new work experience records
        if (data.workExperiences.length > 0) {
          await tx.candidateWorkExperience.createMany({
            data: data.workExperiences.map((workExp: any) => ({
              candidateId,
              company: workExp.company,
              role: workExp.role,
              dateRange: workExp.dateRange,
              description: workExp.description || null
            }))
          });
        }
      }

      // Update education records if provided
      if (data.educations !== undefined) {
        // Delete existing education records
        await tx.candidateEducationLevel.deleteMany({
          where: { candidateId }
        });

        // Create new education records
        if (data.educations.length > 0) {
          await tx.candidateEducationLevel.createMany({
            data: data.educations.map((education: any) => ({
              candidateId,
              school: education.school,
              educationLevel: education.educationLevel,
              dateRange: education.dateRange,
              description: education.description || null
            }))
          });
        }
      }

      return candidate;
    });

    // Fetch the complete updated candidate data
    const completeCandidate = await db.candidate.findUnique({
      where: { id: candidateId },
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
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to delete candidates",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const candidateId = parseInt(params.id);
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
