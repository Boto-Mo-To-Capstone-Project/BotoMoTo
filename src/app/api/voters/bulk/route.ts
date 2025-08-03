import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";

// Handle POST request for bulk voter operations
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return apiResponse({
        success: false,
        message: "You must be logged in to perform bulk voter operations",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if user has admin role
    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPER_ADMIN) {
      return apiResponse({
        success: false,
        message: "Only admin users can perform bulk voter operations",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    const body = await request.json();
    const { operation, voterIds, electionId, data: operationData } = body;

    // Validate required fields
    if (!operation || !voterIds || !Array.isArray(voterIds) || voterIds.length === 0) {
      return apiResponse({
        success: false,
        message: "Operation type and voter IDs are required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate voter IDs
    const validVoterIds = voterIds.filter(id => Number.isInteger(id) && id > 0);
    if (validVoterIds.length === 0) {
      return apiResponse({
        success: false,
        message: "At least one valid voter ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Verify all voters exist and belong to user's organization (for admins)
    const voters = await db.voter.findMany({
      where: {
        id: { in: validVoterIds },
        isDeleted: false,
        ...(electionId && { electionId: parseInt(electionId) })
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
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

    if (voters.length === 0) {
      return apiResponse({
        success: false,
        message: "No valid voters found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check authorization for admins
    if (user.role === ROLES.ADMIN) {
      const unauthorizedVoters = voters.filter(
        voter => voter.election.organization.adminId !== user.id
      );
      
      if (unauthorizedVoters.length > 0) {
        return apiResponse({
          success: false,
          message: "You can only perform operations on voters from your organization's elections",
          data: null,
          error: "Forbidden",
          status: 403
        });
      }
    }

    let result: any;
    let auditMessage: string;

    switch (operation) {
      case 'activate':
        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { isActive: true }
        });
        auditMessage = `Bulk activated ${result.count} voters`;
        break;

      case 'deactivate':
        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { isActive: false }
        });
        auditMessage = `Bulk deactivated ${result.count} voters`;
        break;

      case 'send_codes':
        // This would typically integrate with an email/SMS service
        // For now, we'll just update the codeSendStatus
        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { codeSendStatus: "SENT" }
        });
        auditMessage = `Bulk sent codes to ${result.count} voters`;
        break;

      case 'resend_codes':
        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { codeSendStatus: "RESENT" }
        });
        auditMessage = `Bulk resent codes to ${result.count} voters`;
        break;

      case 'assign_scope':
        if (!operationData?.votingScopeId) {
          return apiResponse({
            success: false,
            message: "Voting scope ID is required for scope assignment",
            data: null,
            error: "Bad Request",
            status: 400
          });
        }

        // Verify voting scope exists and belongs to the same election
        const votingScope = await db.votingScope.findFirst({
          where: {
            id: operationData.votingScopeId,
            electionId: voters[0].electionId,
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

        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { votingScopeId: operationData.votingScopeId }
        });
        auditMessage = `Bulk assigned ${result.count} voters to voting scope: ${votingScope.name}`;
        break;

      case 'soft_delete':
        // Check if any voters have already voted
        const votedVoters = voters.filter(voter => voter.hasVoted);
        if (votedVoters.length > 0) {
          return apiResponse({
            success: false,
            message: `Cannot delete ${votedVoters.length} voter(s) who have already voted`,
            data: null,
            error: "Forbidden",
            status: 403
          });
        }

        result = await db.voter.updateMany({
          where: { id: { in: validVoterIds } },
          data: { 
            isDeleted: true,
            deletedAt: new Date()
          }
        });
        auditMessage = `Bulk soft deleted ${result.count} voters`;
        break;

      default:
        return apiResponse({
          success: false,
          message: "Invalid operation type",
          data: null,
          error: "Bad Request",
          status: 400
        });
    }

    // Create audit log
    const audit = await createAuditLog({
      user,
      action: "UPDATE",
      request,
      resource: "VOTER",
      resourceId: validVoterIds[0], // Use first voter ID as primary resource
      message: auditMessage,
      changedFields: {
        bulkOperation: {
          old: null,
          new: {
            operation,
            voterIds: validVoterIds,
            count: result.count
          }
        }
      }
    });

    return apiResponse({
      success: true,
      message: `Bulk operation completed successfully`,
      data: {
        operation,
        affectedCount: result.count,
        voterIds: validVoterIds,
        audit
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Bulk voter operation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to perform bulk voter operation",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
