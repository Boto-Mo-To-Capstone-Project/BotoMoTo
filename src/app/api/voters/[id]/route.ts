import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { voterUpdateSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request to fetch a specific voter
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
        message: "You must be logged in to view voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can view voter details",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const voterId = parseInt(params.id);
    if (isNaN(voterId)) {
      return apiResponse({
        success: false,
        message: "Invalid voter ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch voter with related data (exclude soft-deleted)
    const voter = await db.voter.findUnique({
      where: {
        id: voterId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                name: true,
                adminId: true
              }
            }
          }
        },
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
      }
    });

    if (!voter || voter.isDeleted || voter.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voter not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this voter (through organization)
    if (user.role === ROLES.ADMIN && voter.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "VOTER",
      resourceId: voter.id,
      message: `Viewed voter: ${voter.firstName} ${voter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: "Voter fetched successfully",
      data: {
        voter,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voter fetch error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch voter",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update a specific voter
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
        message: "You must be logged in to update voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can update voters",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const voterId = parseInt(params.id);
    if (isNaN(voterId)) {
      return apiResponse({
        success: false,
        message: "Invalid voter ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(voterUpdateSchema, body);
    if (!('data' in validation)) return validation;
    const { 
      email, 
      contactNum, 
      firstName, 
      middleName, 
      lastName, 
      votingScopeId, 
      address, 
      isActive 
    } = validation.data;

    // Fetch existing voter (exclude soft-deleted)
    const existingVoter = await db.voter.findUnique({
      where: {
        id: voterId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!existingVoter || existingVoter.isDeleted || existingVoter.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voter not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this voter (through organization)
    if (user.role === ROLES.ADMIN && existingVoter.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if voter has already voted (prevent major changes)
    if (existingVoter.hasVoted) {
      return apiResponse({
        success: false,
        message: "Cannot update voter information after they have voted",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Validate voting scope if provided
    if (votingScopeId) {
      const votingScope = await db.votingScope.findUnique({
        where: {
          id: votingScopeId,
          electionId: existingVoter.electionId,
          isDeleted: false
        }
      });

      if (!votingScope) {
        return apiResponse({
          success: false,
          message: "Invalid voting scope for this election",
          data: null,
          error: "Bad Request",
          status: 400
        });
      }
    }

    // Check for duplicate email in the same election (if email is being updated)
    if (email && email !== existingVoter.email) {
      const emailExists = await db.voter.findFirst({
        where: {
          electionId: existingVoter.electionId,
          email,
          id: { not: voterId },
          isDeleted: false
        }
      });

      if (emailExists) {
        return apiResponse({
          success: false,
          message: "A voter with this email already exists in this election",
          data: null,
          error: "Already exists",
          status: 400
        });
      }
    }

    // Update voter
    const updatedVoter = await db.voter.update({
      where: { id: voterId },
      data: {
        email: email || null,
        contactNum: contactNum || null,
        firstName,
        middleName: middleName || null,
        lastName,
        votingScopeId: votingScopeId || null,
        address: address || null,
        isActive
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        votingScope: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    const fieldsToCheck = ["email", "contactNum", "firstName", "middleName", "lastName", "votingScopeId", "address", "isActive"] as const;
    
    for (const key of fieldsToCheck) {
      if (existingVoter[key] !== updatedVoter[key]) {
        changedFields[key] = { old: existingVoter[key], new: updatedVoter[key] };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "VOTER",
      resourceId: updatedVoter.id,
      changedFields,
    });

    return apiResponse({
      success: true,
      message: "Voter updated successfully",
      data: {
        voter: updatedVoter,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voter update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update voter",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to delete a specific voter
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
        message: "You must be logged in to delete voters",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can delete voters",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const voterId = parseInt(params.id);
    if (isNaN(voterId)) {
      return apiResponse({
        success: false,
        message: "Invalid voter ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Fetch existing voter (exclude soft-deleted)
    const existingVoter = await db.voter.findUnique({
      where: {
        id: voterId,
        isDeleted: false
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            isDeleted: true,
            organization: {
              select: {
                id: true,
                adminId: true
              }
            }
          }
        }
      }
    });

    if (!existingVoter || existingVoter.isDeleted || existingVoter.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Voter not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if admin owns this voter (through organization)
    if (user.role === ROLES.ADMIN && existingVoter.election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete voters from your organization's elections",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if voter has already voted (prevent deletion)
    if (existingVoter.hasVoted) {
      return apiResponse({
        success: false,
        message: "Cannot delete voter after they have voted",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Soft delete voter
    const deletedVoter = await db.voter.update({
      where: { id: voterId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "VOTER",
      resourceId: deletedVoter.id,
      message: `Soft deleted voter: ${existingVoter.firstName} ${existingVoter.lastName}`,
    });

    return apiResponse({
      success: true,
      message: "Voter soft deleted successfully",
      data: {
        voter: deletedVoter,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Voter deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete voter",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
