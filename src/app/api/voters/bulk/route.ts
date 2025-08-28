import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";
import { apiResponse } from "@/lib/apiResponse";
import { createAuditLog } from "@/lib/audit";
import { createEmailService, initializeTemplates } from "@/lib/email";
import { enqueueVotingCodes } from "@/lib/queue/helpers";
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
              email: { not: null }, // Only voters with email addresses
              code: { not: "" }, // Only voters with voting codes
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
          
          console.log(`[Debug] Found ${votersWithDetails.length} voters with details and codes`);

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
          await db.voter.updateMany({
            where: { id: { in: validVoterIds } },
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
          
          // Reset status to PENDING on error
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
              id: { in: validVoterIds },
              code: { not: "" } // Code exists and is not empty
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

          // Update status to SENDING
          await db.voter.updateMany({
            where: { id: { in: votersWithCodes.map(v => v.id) } },
            data: { codeSendStatus: "SENDING" }
          });

          // Prepare voting codes data for resend
          const voterCodes = votersWithCodes.map((voter) => ({
            id: voter.id.toString(),
            email: voter.email!,
            name: `${voter.firstName} ${voter.lastName}`.trim(),
            votingCode: voter.code, // Use existing 6-digit code from database
          }));

          // Get election schedule if available
          const electionSchedule = await db.electionSched.findUnique({
            where: { electionId: votersWithCodes[0].election.id }
          });

          const scheduleData = electionSchedule 
            ? formatElectionSchedule(electionSchedule.dateStart, electionSchedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Enqueue voting codes email jobs
          const jobIds = await enqueueVotingCodes(
            votersWithCodes[0].election.id.toString(),
            voterCodes,
            {
              templateId: templateId || 'voting-code', // Use provided template or default
              templateVars: {
                electionTitle: votersWithCodes[0].election.name,
                organizationName: votersWithCodes[0].election.organization.name,
                ...scheduleData,
              }
            }
          );

          result = { 
            count: votersWithCodes.length, 
            jobIds,
            codes: votersWithCodes.length 
          };
          auditMessage = `Bulk resent codes to ${votersWithCodes.length} voters (Jobs: ${jobIds.length})`;
          
        } catch (error) {
          console.error('Error resending voting codes:', error);
          
          // Reset status to FAILED on error
          await db.voter.updateMany({
            where: { id: { in: validVoterIds } },
            data: { codeSendStatus: "FAILED" }
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

          // Update status to SENDING
          await db.voter.updateMany({
            where: { id: { in: failedVoters.map(v => v.id) } },
            data: { codeSendStatus: "SENDING" }
          });

          // Prepare voting codes data for retry
          const voterCodes = failedVoters.map((voter) => ({
            id: voter.id.toString(),
            email: voter.email!,
            name: `${voter.firstName} ${voter.lastName}`.trim(),
            votingCode: voter.code,
          }));

          // Get election schedule if available
          const electionSchedule = await db.electionSched.findUnique({
            where: { electionId: failedVoters[0].election.id }
          });

          const scheduleData = electionSchedule 
            ? formatElectionSchedule(electionSchedule.dateStart, electionSchedule.dateFinish)
            : { startDate: 'TBD', endDate: 'TBD', expiryDate: 'End of voting period' };

          // Enqueue voting codes email jobs
          const jobIds = await enqueueVotingCodes(
            failedVoters[0].election.id.toString(),
            voterCodes,
            {
              templateId: 'voting-code',
              templateVars: {
                electionTitle: failedVoters[0].election.name,
                organizationName: failedVoters[0].election.organization.name,
                ...scheduleData,
              }
            }
          );

          result = { 
            count: failedVoters.length, 
            jobIds,
            codes: failedVoters.length 
          };
          auditMessage = `Bulk retried failed codes to ${failedVoters.length} voters (Jobs: ${jobIds.length})`;
          
        } catch (error) {
          console.error('Error retrying failed voting codes:', error);
          
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
