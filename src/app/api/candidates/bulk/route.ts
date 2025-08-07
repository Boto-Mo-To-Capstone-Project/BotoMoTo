import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { createAuditLog } from "@/lib/audit";
import db from "@/lib/db/db";
import { ROLES, ORGANIZATION_STATUS } from "@/lib/constants";
import { z } from "zod";

// Bulk operations schema
const bulkCreateCandidatesSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  candidates: z.array(z.object({
    voterId: z.number().int().positive("Voter ID must be a positive integer"),
    positionId: z.number().int().positive("Position ID must be a positive integer"),
    partyId: z.number().int().positive("Party ID must be a positive integer").optional(),
    isNew: z.boolean().default(false),
    imageUrl: z.string().url("Image URL must be valid").optional(),
    bio: z.string().max(1000, "Bio must be at most 1000 characters").optional()
  })).min(1, "At least one candidate is required").max(50, "Maximum 50 candidates per bulk operation")
});

const bulkUpdateCandidatesSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  updates: z.array(z.object({
    candidateId: z.number().int().positive("Candidate ID must be a positive integer"),
    positionId: z.number().int().positive("Position ID must be a positive integer").optional(),
    partyId: z.number().int().positive("Party ID must be a positive integer").optional(),
    isNew: z.boolean().optional(),
    imageUrl: z.string().url("Image URL must be valid").optional(),
    bio: z.string().max(1000, "Bio must be at most 1000 characters").optional()
  })).min(1, "At least one update is required").max(50, "Maximum 50 updates per bulk operation")
});

const bulkDeleteCandidatesSchema = z.object({
  electionId: z.number().int().positive("Election ID must be a positive integer"),
  candidateIds: z.array(z.number().int().positive("Candidate ID must be a positive integer"))
    .min(1, "At least one candidate ID is required")
    .max(50, "Maximum 50 candidates per bulk delete operation")
});

// Handle POST request for bulk candidate creation
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to create candidates",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can create candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateWithZod(bulkCreateCandidatesSchema, body);
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
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only create candidates for your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Validate all voter IDs exist and belong to the election
    const voterIds = data.candidates.map((c: any) => c.voterId);
    const voters = await db.voter.findMany({
      where: {
        id: { in: voterIds },
        electionId: data.electionId,
        isDeleted: false
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });

    if (voters.length !== voterIds.length) {
      const foundVoterIds = voters.map(v => v.id);
      const missingVoterIds = voterIds.filter((id: number) => !foundVoterIds.includes(id));
      return apiResponse({
        success: false,
        message: `Some voters not found in this election: ${missingVoterIds.join(', ')}`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check for existing candidates among the voters
    const existingCandidates = await db.candidate.findMany({
      where: {
        voterId: { in: voterIds },
        isDeleted: false
      },
      select: {
        voterId: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (existingCandidates.length > 0) {
      const existingNames = existingCandidates.map(c => 
        `${c.voter.firstName} ${c.voter.lastName} (ID: ${c.voterId})`
      );
      return apiResponse({
        success: false,
        message: `Some voters are already candidates: ${existingNames.join(', ')}`,
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Validate all position IDs exist and belong to the election
    const positionIdsSet = new Set(data.candidates.map((c: any) => c.positionId as number));
    const positionIds = Array.from(positionIdsSet) as number[];
    const positions = await db.position.findMany({
      where: {
        id: { in: positionIds },
        electionId: data.electionId,
        isDeleted: false
      },
      select: {
        id: true,
        name: true
      }
    });

    if (positions.length !== positionIds.length) {
      const foundPositionIds = positions.map(p => p.id);
      const missingPositionIds = positionIds.filter(id => !foundPositionIds.includes(id));
      return apiResponse({
        success: false,
        message: `Some positions not found in this election: ${missingPositionIds.join(', ')}`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate party IDs if provided
    const partyIdsSet = new Set(data.candidates.map((c: any) => c.partyId).filter(Boolean));
    const partyIds = Array.from(partyIdsSet) as number[];
    if (partyIds.length > 0) {
      const parties = await db.party.findMany({
        where: {
          id: { in: partyIds },
          electionId: data.electionId,
          isDeleted: false
        },
        select: {
          id: true,
          name: true
        }
      });

      if (parties.length !== partyIds.length) {
        const foundPartyIds = parties.map(p => p.id);
        const missingPartyIds = partyIds.filter(id => !foundPartyIds.includes(id));
        return apiResponse({
          success: false,
          message: `Some parties not found in this election: ${missingPartyIds.join(', ')}`,
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Create candidates in transaction
    const results = await db.$transaction(async (tx) => {
      const createdCandidates = [];

      for (const candidateData of data.candidates) {
        const candidate = await tx.candidate.create({
          data: {
            electionId: data.electionId,
            voterId: candidateData.voterId,
            positionId: candidateData.positionId,
            partyId: candidateData.partyId || null,
            imageUrl: candidateData.imageUrl || null,
            bio: candidateData.bio || null,
            isNew: candidateData.isNew || false
          },
          select: {
            id: true,
            voter: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            position: {
              select: {
                name: true
              }
            },
            party: {
              select: {
                name: true
              }
            }
          }
        });

        createdCandidates.push(candidate);
      }

      return createdCandidates;
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "CREATE",
      request,
      resource: "CANDIDATE",
      resourceId: data.electionId,
      message: `Bulk created ${results.length} candidates for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully created ${results.length} candidates`,
      data: {
        candidates: results,
        count: results.length,
        audit
      },
      error: null,
      status: 201
    });

  } catch (error) {
    console.error("Bulk candidate creation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to create candidates",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request for bulk candidate updates
export async function PUT(request: NextRequest) {
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

    const body = await request.json();

    // Validate request body
    const validation = validateWithZod(bulkUpdateCandidatesSchema, body);
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
        organization: {
          select: {
            adminId: true,
            status: true
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

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Verify all candidate IDs exist and belong to the election
    const candidateIds = data.updates.map((u: any) => u.candidateId);
    const candidates = await db.candidate.findMany({
      where: {
        id: { in: candidateIds },
        electionId: data.electionId,
        isDeleted: false
      },
      select: {
        id: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (candidates.length !== candidateIds.length) {
      const foundCandidateIds = candidates.map(c => c.id);
      const missingCandidateIds = candidateIds.filter((id: number) => !foundCandidateIds.includes(id));
      return apiResponse({
        success: false,
        message: `Some candidates not found in this election: ${missingCandidateIds.join(', ')}`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Update candidates in transaction
    const results = await db.$transaction(async (tx) => {
      const updatedCandidates = [];

      for (const updateData of data.updates) {
        const updateFields: any = {
          updatedAt: new Date()
        };

        if (updateData.positionId !== undefined) updateFields.positionId = updateData.positionId;
        if (updateData.partyId !== undefined) updateFields.partyId = updateData.partyId;
        if (updateData.isNew !== undefined) updateFields.isNew = updateData.isNew;
        if (updateData.imageUrl !== undefined) updateFields.imageUrl = updateData.imageUrl;
        if (updateData.bio !== undefined) updateFields.bio = updateData.bio;

        const candidate = await tx.candidate.update({
          where: { id: updateData.candidateId },
          data: updateFields,
          select: {
            id: true,
            voter: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        });

        updatedCandidates.push(candidate);
      }

      return updatedCandidates;
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "CANDIDATE",
      resourceId: data.electionId,
      message: `Bulk updated ${results.length} candidates for election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully updated ${results.length} candidates`,
      data: {
        candidates: results,
        count: results.length,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Bulk candidate update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update candidates",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request for bulk candidate deletion
export async function DELETE(request: NextRequest) {
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

    const body = await request.json();

    // Validate request body
    const validation = validateWithZod(bulkDeleteCandidatesSchema, body);
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
        organization: {
          select: {
            adminId: true,
            status: true
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

    // Check if admin owns this election
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete candidates from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check organization status
    if (election.organization.status !== ORGANIZATION_STATUS.APPROVED) {
      return apiResponse({
        success: false,
        message: "Organization must be approved to manage candidates",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Verify all candidate IDs exist and belong to the election
    const candidates = await db.candidate.findMany({
      where: {
        id: { in: data.candidateIds },
        electionId: data.electionId,
        isDeleted: false
      },
      select: {
        id: true,
        voter: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            voteResponses: true
          }
        }
      }
    });

    if (candidates.length !== data.candidateIds.length) {
      const foundCandidateIds = candidates.map(c => c.id);
      const missingCandidateIds = data.candidateIds.filter((id: number) => !foundCandidateIds.includes(id));
      return apiResponse({
        success: false,
        message: `Some candidates not found in this election: ${missingCandidateIds.join(', ')}`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if any candidates have votes
    const candidatesWithVotes = candidates.filter(c => c._count.voteResponses > 0);
    if (candidatesWithVotes.length > 0) {
      const candidateNames = candidatesWithVotes.map(c => 
        `${c.voter.firstName} ${c.voter.lastName} (${c._count.voteResponses} votes)`
      );
      return apiResponse({
        success: false,
        message: `Cannot delete candidates who have received votes: ${candidateNames.join(', ')}`,
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Delete candidates in transaction
    const deletedCount = await db.$transaction(async (tx) => {
      await tx.candidate.updateMany({
        where: {
          id: { in: data.candidateIds }
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return data.candidateIds.length;
    });

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "CANDIDATE",
      resourceId: data.electionId,
      message: `Bulk deleted ${deletedCount} candidates from election: ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: `Successfully deleted ${deletedCount} candidates`,
      data: {
        deletedCandidateIds: data.candidateIds,
        count: deletedCount,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Bulk candidate deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete candidates",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
