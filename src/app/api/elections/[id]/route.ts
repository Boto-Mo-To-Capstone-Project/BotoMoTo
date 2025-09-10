// Import necessary modules and constants
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES, ELECTION_STATUS } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { electionSchema } from "@/lib/schema";
import { createAuditLog } from "@/lib/audit";

// Handle GET request for specific election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const electionId = parseInt(id);
    
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            adminId: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: {
            voters: {
              where: { isDeleted: false }
            },
            candidates: {
              where: { isDeleted: false }
            },
            positions: {
              where: { isDeleted: false }
            },
            parties: {
              where: { isDeleted: false }
            },
            voteResponses: true
          }
        }
      },
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

    // Admin can only get their own elections, superadmin can get others
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only view elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const audit = await createAuditLog({
      user,
      action: "READ",
      request,
      resource: "ELECTION",
      resourceId: election.id,
      message: user.role === ROLES.SUPER_ADMIN 
        ? `Viewed election details (superadmin): ${election.name}`
        : `Viewed own election details (admin): ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election details fetched successfully",
      data: {
        election,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Get election error:", error);
    return apiResponse({
      success: false,
      message: "Failed to fetch election details",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle PUT request to update specific election
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const electionId = parseInt(id);
    
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Parse and validate request body
    const rawBody = await request.json();
    const validation = validateWithZod(electionSchema, rawBody);
    if (!('data' in validation)) return validation;
    
    const { 
      name, 
      description, 
      status, 
      allowSurvey, 
      isTemplate, 
      templateId, 
      instanceYear, 
      instanceName 
    } = validation.data;

    // Validate template/instance logic for updates
    if (isTemplate && templateId) {
      return apiResponse({
        success: false,
        message: 'Templates cannot have a parent template',
        error: 'Bad Request',
        status: 400,
      });
    }

    // For templates (repeating elections), require instance details
    if (isTemplate && (!instanceYear || !instanceName)) {
      return apiResponse({
        success: false,
        message: 'instanceYear and instanceName are required for repeating elections',
        error: 'Bad Request',
        status: 400,
      });
    }

    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            adminId: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
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

    // Admin can only update their own elections, superadmin can edit others
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only update elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Validate template/instance relationships for updates
    if (!isTemplate && templateId) {
      // This is an instance - require year and name
      if (!instanceYear || !instanceName) {
        return apiResponse({
          success: false,
          message: 'instanceYear and instanceName are required for election instances',
          error: 'Bad Request',
          status: 400,
        });
      }

      // Verify template exists and belongs to this organization
      const template = await db.election.findUnique({
        where: { 
          id: templateId,
          isDeleted: false,
          isTemplate: true,
          orgId: election.organization.id
        }
      });

      if (!template) {
        return apiResponse({
          success: false,
          message: 'Template not found or does not belong to your organization',
          error: 'Not Found',
          status: 404,
        });
      }
    }

    // Check if election name already exists in the organization (excluding current election)
    const nameExists = await db.election.findFirst({
      where: {
        orgId: election.organization.id,
        name,
        isDeleted: false,
        NOT: {
          id: electionId
        }
      }
    });

    if (nameExists) {
      return apiResponse({
        success: false,
        message: "Election name already exists in this organization",
        data: null,
        error: "Conflict",
        status: 409
      });
    }

    // Store old data for audit comparison
    const oldData = {
      name: election.name,
      description: election.description,
      status: election.status,
      allowSurvey: election.allowSurvey,
      isTemplate: election.isTemplate,
      templateId: election.templateId,
      instanceYear: election.instanceYear,
      instanceName: election.instanceName,
    } as const;

    const updatedElection = await db.election.update({
      where: { id: electionId },
      data: {
        name,
        description,
        status,
        allowSurvey,
        isTemplate: isTemplate || false,
        templateId: templateId || null,
        instanceYear: instanceYear || null,
        instanceName: instanceName || null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        schedule: true,
        mfaSettings: true,
        _count: {
          select: {
            voters: {
              where: { isDeleted: false }
            },
            candidates: {
              where: { isDeleted: false }
            },
            positions: {
              where: { isDeleted: false }
            },
            parties: {
              where: { isDeleted: false }
            }
          }
        }
      },
    });

    // Schedule update handling: accept start/end from multiple shapes
    const rawStart = rawBody?.schedule?.dateStart ?? rawBody?.schedule?.startDate ?? rawBody?.startDate ?? null;
    const rawEnd = rawBody?.schedule?.dateFinish ?? rawBody?.schedule?.endDate ?? rawBody?.endDate ?? null;

    if ((rawStart && !rawEnd) || (!rawStart && rawEnd)) {
      return apiResponse({
        success: false,
        message: 'Both startDate and endDate are required when updating schedule',
        data: { election: updatedElection },
        error: 'Bad Request',
        status: 400,
      });
    }

    if (rawStart && rawEnd) {
      const start = new Date(rawStart);
      const end = new Date(rawEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return apiResponse({
          success: false,
          message: 'Invalid date format for schedule. Use ISO strings.',
          data: { election: updatedElection },
          error: 'Bad Request',
          status: 400,
        });
      }
      if (start >= end) {
        return apiResponse({
          success: false,
          message: 'Schedule startDate must be earlier than endDate',
          data: { election: updatedElection },
          error: 'Bad Request',
          status: 400,
        });
      }

      await db.electionSched.upsert({
        where: { electionId: updatedElection.id },
        create: { electionId: updatedElection.id, dateStart: start, dateFinish: end },
        update: { dateStart: start, dateFinish: end },
      });
    }

    // Re-fetch with schedule after potential update
    const finalElection = await db.election.findUnique({
      where: { id: updatedElection.id },
      include: {
        organization: { select: { id: true, name: true, email: true, status: true } },
        schedule: true,
        mfaSettings: true,
        _count: { select: { voters: { where: { isDeleted: false } }, candidates: { where: { isDeleted: false } }, positions: { where: { isDeleted: false } }, parties: { where: { isDeleted: false } } } }
      }
    });

    // Compare and log changed fields
    const changedFields: Record<string, { old: any; new: any }> = {};
    for (const key of ["name", "description", "status", "allowSurvey", "isTemplate", "templateId", "instanceYear", "instanceName"] as const) {
      const oldVal = (oldData as any)[key];
      const newVal = (updatedElection as any)[key] ?? null;
      if (oldVal !== newVal) {
        changedFields[key] = { old: oldVal, new: newVal };
      }
    }

    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "ELECTION",
      resourceId: updatedElection.id,
      changedFields,
      message: user.role === ROLES.SUPER_ADMIN 
        ? `Updated election (superadmin): ${updatedElection.name}`
        : `Updated own election (admin): ${updatedElection.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election updated successfully",
      data: {
        election: finalElection,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election update error:", error);
    return apiResponse({
      success: false,
      message: "Failed to update election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}

// Handle DELETE request to soft-delete specific election
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const electionId = parseInt(id);
    
    if (isNaN(electionId)) {
      return apiResponse({
        success: false,
        message: "Invalid election ID",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    const election = await db.election.findUnique({
      where: {
        id: electionId,
        isDeleted: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            adminId: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            voteResponses: true
          }
        }
      },
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

    // Admin can only delete their own elections, superadmin can delete others
    if (user.role === ROLES.ADMIN && election.organization.adminId !== user.id) {
      return apiResponse({
        success: false,
        message: "You can only delete elections from your organization",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check if election has votes
    if (election._count.voteResponses > 0) {
      return apiResponse({
        success: false,
        message: "Cannot delete election that has votes",
        data: { 
          voteCount: election._count.voteResponses 
        },
        error: "Conflict",
        status: 409
      });
    }

    // Soft delete election
    const deletedElection = await db.election.update({
      where: { id: electionId },
      data: { 
        isDeleted: true, 
        deletedAt: new Date() 
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    const audit = await createAuditLog({
      user,
      action: "DELETE",
      request,
      resource: "ELECTION",
      resourceId: deletedElection.id,
      deletionType: "SOFT",
      message: user.role === ROLES.SUPER_ADMIN 
        ? `Deleted election (superadmin): ${election.name}`
        : `Deleted own election (admin): ${election.name}`,
    });

    return apiResponse({
      success: true,
      message: "Election deleted successfully",
      data: {
        election: deletedElection,
        audit
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error("Election deletion error:", error);
    return apiResponse({
      success: false,
      message: "Failed to delete election",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}


