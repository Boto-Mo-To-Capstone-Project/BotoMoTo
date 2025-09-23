import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { createEmailService, initializeTemplates } from "@/lib/email";
import { formatElectionSchedule } from "@/lib/email/templates/data";
import { requireAuth } from "@/lib/helpers/requireAuth";

// Handle POST request for bulk voter operations
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN]);
        if (!authResult.authorized) {
            return authResult.response;
        }
        const user = authResult.user;
    

    const body = await request.json();
    const { operation, voterIds, electionId, data: operationData, templateId } = body;

    // Validate required fields
    if (!operation) {
      return apiResponse({
        success: false,
        message: "Operation type is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate voterIds for all bulk operations
    if (!voterIds || !Array.isArray(voterIds) || voterIds.length === 0) {
      return apiResponse({
        success: false,
        message: "Voter IDs are required for bulk operations",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }
    
    const validVoterIds = voterIds.filter((id: any) => Number.isInteger(id) && id > 0);
    if (validVoterIds.length === 0) {
      return apiResponse({
        success: false,
        message: "At least one valid voter ID is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Verify existing voters and authorization
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
        try {
          // Initialize email templates
          initializeTemplates();
          
          console.log(`[Debug] Looking for voters with IDs: ${validVoterIds.join(', ')}`);
          console.log(`[Debug] Election ID filter: ${electionId}`);
          
          // Get full voter details with election info
          const votersWithDetails = await db.voter.findMany({
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
                    select: { id: true, name: true }
                  }
                }
              }
            }
          });
          
          console.log(`[Debug] Found ${votersWithDetails.length} voters with details`);

          if (votersWithDetails.length === 0) {
            return apiResponse({
              success: false,
              message: "No voters found to send codes to",
              data: null,
              error: "Not Found",
              status: 404
            });
          }

          // **DIRECT SENDING** - Same pattern as comprehensive test
          console.log(`[Bulk Send] Using DIRECT sending for ${votersWithDetails.length} voters with template: ${templateId || 'voting-code'}`);
          
          // Create email service (same as comprehensive test)
          const emailService = await createEmailService();
          
          // Update voters status to SENDING
          const voterIds = votersWithDetails.map(v => v.id);
          await db.voter.updateMany({
            where: { id: { in: voterIds } },
            data: { codeSendStatus: "SENDING" }
          });

          // Get election schedule if available
          const electionSchedule = await db.electionSched.findUnique({
            where: { electionId: votersWithDetails[0].election.id }
          });

          const scheduleData = electionSchedule 
            ? formatElectionSchedule(electionSchedule.dateStart, electionSchedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Process in chunks for reliability (like comprehensive test bulk pattern)
          const CHUNK_SIZE = 50;
          const chunks = [];
          for (let i = 0; i < votersWithDetails.length; i += CHUNK_SIZE) {
            chunks.push(votersWithDetails.slice(i, i + CHUNK_SIZE));
          }

          let totalSent = 0;
          let totalFailed = 0;
          const failedVoters: any[] = [];

          console.log(`[Bulk Send] Processing ${votersWithDetails.length} voters in ${chunks.length} chunks`);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[Bulk Send] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} voters)`);

            try {
              // Send individual template emails for each voter in this chunk
              const sendPromises = chunk.map(voter => 
                emailService.sendTemplate(
                  templateId || 'voting-code',
                  {
                    voterName: `${voter.firstName} ${voter.lastName}`.trim(),
                    electionTitle: voter.election.name,
                    votingCode: voter.code,
                    organizationName: voter.election.organization.name,
                    startDate: scheduleData.startDate || 'TBD',
                    endDate: scheduleData.endDate || 'TBD', 
                    expiryDate: scheduleData.expiryDate || 'End of voting period',
                    contactEmail: 'support@boto-mo-to.online'
                  },
                  { email: voter.email!, name: `${voter.firstName} ${voter.lastName}`.trim() },
                  { organizationId: voter.election.organization.id }
                )
              );

              // Execute all sends for this chunk
              const chunkResults = await Promise.all(sendPromises);
              
              // Update successful voters
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: {
                  codeSendStatus: 'SENT'
                }
              });

              totalSent += chunk.length;
              console.log(`[Bulk Send] Chunk ${i + 1} completed successfully`);

            } catch (chunkError) {
              console.error(`[Bulk Send] Chunk ${i + 1} failed:`, chunkError);
              
              // Mark chunk voters as failed
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: { codeSendStatus: 'FAILED' }
              });

              totalFailed += chunk.length;
              failedVoters.push(...chunk.map(v => ({ 
                ...v, 
                error: chunkError instanceof Error ? chunkError.message : 'Unknown error'
              })));
            }

            // Small delay between chunks (rate limiting)
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          result = {
            method: 'direct',
            total: votersWithDetails.length,
            sent: totalSent,
            failed: totalFailed,
            successRate: `${Math.round((totalSent / votersWithDetails.length) * 100)}%`,
            failedVoters: failedVoters.map(v => ({
              id: v.id,
              name: `${v.firstName} ${v.lastName}`.trim(),
              email: v.email,
              error: v.error
            }))
          };
          auditMessage = `Direct sent voting codes: ${totalSent} sent, ${totalFailed} failed`;

        } catch (error) {
          console.error('Direct bulk send error:', error);
          
          // Reset status to PENDING on error (use original validVoterIds which is in scope)
          await db.voter.updateMany({
            where: { id: { in: validVoterIds } },
            data: { codeSendStatus: "PENDING" }
          });
          
          return apiResponse({
            success: false,
            message: "Failed to send voting codes",
            data: null,
            error: error instanceof Error ? error.message : "Unknown error",
            status: 500
          });
        }
        break;

      case 'resend_codes':
        try {
          // Initialize email templates
          initializeTemplates();
          
          // Get voters with existing codes (use 'code' field, not 'votingCode')
          const votersWithCodes = await db.voter.findMany({
            where: { 
              id: { in: validVoterIds }
            },
            include: {
              election: {
                select: {
                  id: true,
                  name: true,
                  organization: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          });

          if (votersWithCodes.length === 0) {
            return apiResponse({
              success: false,
              message: "No voters found with existing voting codes",
              data: null,
              error: "Bad Request",
              status: 400
            });
          }

          // **DIRECT RESENDING** - Same pattern as send_codes
          console.log(`[Bulk Resend] Using DIRECT resending for ${votersWithCodes.length} voters with template: ${templateId || 'voting-code'}`);
          
          // Create email service
          const emailService = await createEmailService();
          
          // Update status to SENDING
          const resendVoterIds = votersWithCodes.map(v => v.id);
          await db.voter.updateMany({
            where: { id: { in: resendVoterIds } },
            data: { codeSendStatus: "SENDING" }
          });

          // Get election schedule if available
          const electionSchedule = await db.electionSched.findUnique({
            where: { electionId: votersWithCodes[0].election.id }
          });

          const scheduleData = electionSchedule 
            ? formatElectionSchedule(electionSchedule.dateStart, electionSchedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Process in chunks for reliability
          const CHUNK_SIZE = 50;
          const chunks = [];
          for (let i = 0; i < votersWithCodes.length; i += CHUNK_SIZE) {
            chunks.push(votersWithCodes.slice(i, i + CHUNK_SIZE));
          }

          let totalSent = 0;
          let totalFailed = 0;
          const failedVoters: any[] = [];

          console.log(`[Bulk Resend] Processing ${votersWithCodes.length} voters in ${chunks.length} chunks`);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[Bulk Resend] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} voters)`);

            try {
              // Send individual template emails for each voter in this chunk
              const sendPromises = chunk.map(voter => 
                emailService.sendTemplate(
                  templateId || 'voting-code',
                  {
                    voterName: `${voter.firstName} ${voter.lastName}`.trim(),
                    electionTitle: voter.election.name,
                    votingCode: voter.code,
                    organizationName: voter.election.organization.name,
                    startDate: scheduleData.startDate || 'TBD',
                    endDate: scheduleData.endDate || 'TBD', 
                    expiryDate: scheduleData.expiryDate || 'End of voting period',
                    contactEmail: 'support@boto-mo-to.online'
                  },
                  { email: voter.email!, name: `${voter.firstName} ${voter.lastName}`.trim() },
                  { organizationId: voter.election.organization.id }
                )
              );

              // Execute all sends for this chunk
              const chunkResults = await Promise.all(sendPromises);
              
              // Update successful voters
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: {
                  codeSendStatus: 'SENT'
                }
              });

              totalSent += chunk.length;
              console.log(`[Bulk Resend] Chunk ${i + 1} completed successfully`);

            } catch (chunkError) {
              console.error(`[Bulk Resend] Chunk ${i + 1} failed:`, chunkError);
              
              // Mark chunk voters as failed
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: { codeSendStatus: 'FAILED' }
              });

              totalFailed += chunk.length;
              failedVoters.push(...chunk.map(v => ({ 
                ...v, 
                error: chunkError instanceof Error ? chunkError.message : 'Unknown error'
              })));
            }

            // Small delay between chunks (rate limiting)
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          result = {
            method: 'direct',
            total: votersWithCodes.length,
            sent: totalSent,
            failed: totalFailed,
            successRate: `${Math.round((totalSent / votersWithCodes.length) * 100)}%`,
            failedVoters: failedVoters.map(v => ({
              id: v.id,
              name: `${v.firstName} ${v.lastName}`.trim(),
              email: v.email,
              error: v.error
            }))
          };
          auditMessage = `Direct resent voting codes: ${totalSent} sent, ${totalFailed} failed`;
          
        } catch (error) {
          console.error('Direct bulk resend error:', error);
          
          // Reset status to PENDING on error
          await db.voter.updateMany({
            where: { id: { in: validVoterIds } },
            data: { codeSendStatus: "PENDING" }
          });
          
          return apiResponse({
            success: false,
            message: "Failed to resend voting codes",
            data: null,
            error: error instanceof Error ? error.message : "Unknown error",
            status: 500
          });
        }
        break;

      case 'retry_failed':
        try {
          // Initialize email templates
          initializeTemplates();
          
          // Get voters with FAILED status
          const failedVoters = await db.voter.findMany({
            where: { 
              id: { in: validVoterIds },
              codeSendStatus: "FAILED"
            },
            include: {
              election: {
                select: {
                  id: true,
                  name: true,
                  organization: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          });

          if (failedVoters.length === 0) {
            return apiResponse({
              success: false,
              message: "No failed voters found to retry",
              data: null,
              error: "Bad Request",
              status: 400
            });
          }

          // **DIRECT RETRY** - Same pattern as send_codes
          console.log(`[Bulk Retry] Using DIRECT retry for ${failedVoters.length} voters with template: ${templateId || 'voting-code'}`);
          
          // Create email service
          const emailService = await createEmailService();
          
          // Update status to SENDING
          const failedVoterIds = failedVoters.map(v => v.id);
          await db.voter.updateMany({
            where: { id: { in: failedVoterIds } },
            data: { codeSendStatus: "SENDING" }
          });

          // Get election schedule if available
          const electionSchedule = await db.electionSched.findUnique({
            where: { electionId: failedVoters[0].election.id }
          });

          const scheduleData = electionSchedule 
            ? formatElectionSchedule(electionSchedule.dateStart, electionSchedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Process in chunks for reliability
          const CHUNK_SIZE = 50;
          const chunks = [];
          for (let i = 0; i < failedVoters.length; i += CHUNK_SIZE) {
            chunks.push(failedVoters.slice(i, i + CHUNK_SIZE));
          }

          let totalSent = 0;
          let totalFailed = 0;
          const retriedFailedVoters: any[] = [];

          console.log(`[Bulk Retry] Processing ${failedVoters.length} voters in ${chunks.length} chunks`);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`[Bulk Retry] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} voters)`);

            try {
              // Send individual template emails for each voter in this chunk
              const sendPromises = chunk.map(voter => 
                emailService.sendTemplate(
                  templateId || 'voting-code',
                  {
                    voterName: `${voter.firstName} ${voter.lastName}`.trim(),
                    electionTitle: voter.election.name,
                    votingCode: voter.code,
                    organizationName: voter.election.organization.name,
                    startDate: scheduleData.startDate || 'TBD',
                    endDate: scheduleData.endDate || 'TBD', 
                    expiryDate: scheduleData.expiryDate || 'End of voting period',
                    contactEmail: 'support@boto-mo-to.online'
                  },
                  { email: voter.email!, name: `${voter.firstName} ${voter.lastName}`.trim() },
                  { organizationId: voter.election.organization.id }
                )
              );

              // Execute all sends for this chunk
              const chunkResults = await Promise.all(sendPromises);
              
              // Update successful voters
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: {
                  codeSendStatus: 'SENT'
                }
              });

              totalSent += chunk.length;
              console.log(`[Bulk Retry] Chunk ${i + 1} completed successfully`);

            } catch (chunkError) {
              console.error(`[Bulk Retry] Chunk ${i + 1} failed:`, chunkError);
              
              // Mark chunk voters as failed again
              await db.voter.updateMany({
                where: { id: { in: chunk.map(v => v.id) } },
                data: { codeSendStatus: 'FAILED' }
              });

              totalFailed += chunk.length;
              retriedFailedVoters.push(...chunk.map(v => ({ 
                ...v, 
                error: chunkError instanceof Error ? chunkError.message : 'Unknown error'
              })));
            }

            // Small delay between chunks (rate limiting)
            if (i < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          result = {
            method: 'direct',
            total: failedVoters.length,
            sent: totalSent,
            failed: totalFailed,
            successRate: `${Math.round((totalSent / failedVoters.length) * 100)}%`,
            failedVoters: retriedFailedVoters.map(v => ({
              id: v.id,
              name: `${v.firstName} ${v.lastName}`.trim(),
              email: v.email,
              error: v.error
            }))
          };
          auditMessage = `Direct retried voting codes: ${totalSent} sent, ${totalFailed} failed`;
          
        } catch (error) {
          console.error('Direct bulk retry error:', error);
          
          // Reset status to FAILED on error
          await db.voter.updateMany({
            where: { id: { in: validVoterIds } },
            data: { codeSendStatus: "FAILED" }
          });
          
          return apiResponse({
            success: false,
            message: "Failed to retry voting codes",
            data: null,
            error: error instanceof Error ? error.message : "Unknown error",
            status: 500
          });
        }
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
        // Determine which voters have votes via VoteResponse
        const votedVoterIdsRows = await db.voteResponse.findMany({
          where: { voterId: { in: validVoterIds }, electionId: voters[0].electionId },
          select: { voterId: true },
          distinct: ['voterId']
        });
        const votedVoterIds = new Set(votedVoterIdsRows.map(r => r.voterId));
        const deletableIds = validVoterIds.filter((id: number) => !votedVoterIds.has(id));

        if (deletableIds.length === 0) {
          return apiResponse({
            success: false,
            message: `Cannot delete selected voter(s) who have already voted`,
            data: null,
            error: "Forbidden",
            status: 403
          });
        }

        result = await db.voter.updateMany({
          where: { id: { in: deletableIds } },
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
            count: result.count || result.total || 0 // Handle both count and total properties
          }
        }
      }
    });

    // Determine affected count based on operation type
    const affectedCount = ['send_codes', 'resend_codes', 'retry_failed'].includes(operation) 
      ? result.total || 0 
      : result.count || 0;

    return apiResponse({
      success: true,
      message: `Bulk operation completed successfully`,
      data: {
        operation,
        affectedCount,
        voterIds: validVoterIds,
        audit,
        ...(result.method && { // Include additional email operation details
          emailResults: {
            method: result.method,
            total: result.total,
            sent: result.sent,
            failed: result.failed,
            successRate: result.successRate,
            failedVoters: result.failedVoters
          }
        })
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
