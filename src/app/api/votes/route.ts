import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { validateWithZod } from "@/lib/validateWithZod";
import { z } from "zod";
import crypto from "crypto";

// HMAC secret key from environment variables
const VOTE_SECRET = process.env.VOTE_SECRET;

// Vote submission schema (removed voterCode requirement as it comes from session)
const voteSubmissionSchema = z.object({
  votes: z.array(z.object({
    candidateId: z.number().positive(),
    positionId: z.number().positive()
  })).min(1, "At least one vote is required")
});

// Handle POST request to submit votes
export async function POST(request: NextRequest) {
  try {
    if (!VOTE_SECRET) {
      return apiResponse({
        success: false,
        message: "Voting service is not properly configured",
        data: null,
        error: "Server Misconfiguration",
        status: 500
      });
    }

    // Validate session using HttpOnly cookie
    const sessionToken = request.cookies.get('voter_session')?.value;
    if (!sessionToken) {
      return apiResponse({
        success: false,
        message: "No active session. Please log in.",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Find active session in database (cookie-based session validation)
    const session = await db.voterSession.findFirst({
      where: { 
        sessionToken,
        isActive: true
      },
      include: {
        voter: {
          include: {
            election: {
              select: {
                id: true,
                name: true,
                status: true,
                isDeleted: true,
                schedule: {
                  select: {
                    dateStart: true,
                    dateFinish: true
                  }
                }
              }
            },
            voteResponses: {
              where: { electionId: { not: undefined as any } },
              select: { id: true },
              take: 1
            }
          }
        }
      }
    });

    if (!session || !session.isActive) {
      return apiResponse({
        success: false,
        message: "Invalid or expired session. Please log in again.",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if session has expired
    if (new Date() > session.expires) {
      // Deactivate expired session
      await db.voterSession.update({
        where: { id: session.id },
        data: { isActive: false }
      });
      
      return apiResponse({
        success: false,
        message: "Session has expired. Please log in again.",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Race condition protection: Check for multiple active sessions (for non-voted users)
    if (!session.voter.voteResponses.length) {
      const activeSessions = await db.voterSession.count({
        where: {
          voterId: session.voter.id,
          isActive: true,
          id: { not: session.id } // Exclude current session
        }
      });

      if (activeSessions > 0) {
        // Deactivate all sessions for this voter to prevent concurrent voting
        await db.voterSession.updateMany({
          where: {
            voterId: session.voter.id,
            isActive: true
          },
          data: { isActive: false }
        });

        return apiResponse({
          success: false,
          message: "Multiple login sessions detected. Please log in again for security.",
          data: null,
          error: "Multiple Sessions",
          status: 409
        });
      }
    }
    
    // Parse and validate input
    const body = await request.json();
    const validation = validateWithZod(voteSubmissionSchema, body);
    if (!('data' in validation)) return validation;

    const { votes } = validation.data;
    const voter = session.voter;

    // Check if voter exists and is valid
    if (!voter || voter.isDeleted) {
      return apiResponse({
        success: false,
        message: "Invalid voter code",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if election exists and is not deleted
    if (!voter.election || voter.election.isDeleted) {
      return apiResponse({
        success: false,
        message: "Election not found or has been deleted",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Check if voter is active
    if (!voter.isActive) {
      return apiResponse({
        success: false,
        message: "Voter account is inactive. Please contact election administrators.",
        data: null,
        error: "Forbidden",
        status: 403
      });
    }

    // Check election status
    if (voter.election.status !== "ACTIVE") {
      let message = "Election is not currently active.";
      
      switch (voter.election.status) {
        case "DRAFT":
          message = "Election has not started yet.";
          break;
        case "CLOSED":
          message = "Election has ended.";
          break;
      }

      return apiResponse({
        success: false,
        message,
        data: null,
        error: "Election Not Active",
        status: 403
      });
    }

    // Check election schedule if available
    if (voter.election.schedule) {
      const now = new Date();
      const startDate = new Date(voter.election.schedule.dateStart);
      const endDate = new Date(voter.election.schedule.dateFinish);

      if (now < startDate) {
        return apiResponse({
          success: false,
          message: `Election starts on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}`,
          data: null,
          error: "Election Not Started",
          status: 403
        });
      }

      if (now > endDate) {
        return apiResponse({
          success: false,
          message: `Election ended on ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`,
          data: null,
          error: "Election Ended",
          status: 403
        });
      }
    }

    // Check if voter has already voted
    const hasVoted = voter.voteResponses.length > 0;
    if (hasVoted) {
      return apiResponse({
        success: false,
        message: "You have already voted in this election.",
        data: null,
        error: "Already Voted",
        status: 403
      });
    }

    // Validate candidates and positions exist and belong to the election
    for (const vote of votes) {
      const candidate = await db.candidate.findUnique({
        where: {
          id: vote.candidateId,
          isDeleted: false
        },
        include: {
          position: {
            select: {
              id: true,
              electionId: true,
              votingScopeId: true
            }
          }
        }
      });

      if (!candidate) {
        return apiResponse({
          success: false,
          message: `Candidate with ID ${vote.candidateId} not found`,
          data: null,
          error: "Invalid Candidate",
          status: 400
        });
      }

      // Check if candidate's position belongs to the same election
      if (candidate.position.electionId !== voter.election.id) {
        return apiResponse({
          success: false,
          message: "Candidate does not belong to this election",
          data: null,
          error: "Invalid Candidate",
          status: 400
        });
      }

      // Check if candidate's position matches the provided position ID
      if (candidate.position.id !== vote.positionId) {
        return apiResponse({
          success: false,
          message: `Candidate ${vote.candidateId} does not belong to position ${vote.positionId}`,
          data: null,
          error: "Invalid Vote",
          status: 400
        });
      }

      // Check voting scope if applicable
      if (candidate.position.votingScopeId && candidate.position.votingScopeId !== voter.votingScopeId) {
        return apiResponse({
          success: false,
          message: "You are not eligible to vote for this position",
          data: null,
          error: "Invalid Voting Scope",
          status: 403
        });
      }
    }

    // Create vote responses in a transaction with additional race condition protection
    const voteResponses = await db.$transaction(async (tx) => {
      // Double-check that voter hasn't voted during this request processing (race condition protection)
      const recentVote = await tx.voteResponse.findFirst({
        where: { 
          voterId: voter.id,
          electionId: voter.election.id
        },
        select: { id: true }
      });

      if (recentVote) {
        throw new Error("Vote already submitted during processing");
      }

      const responses: any[] = [];
      
      // Get the current chain state for this election
      const lastVote = await tx.voteResponse.findFirst({
        where: { electionId: voter.election.id },
        orderBy: { chainOrder: 'desc' },
        select: { voteHash: true, chainOrder: true }
      });
      
      let lastVoteHash = lastVote?.voteHash || '0'; // Genesis hash if no previous votes
      let electionChainOrder = (lastVote?.chainOrder || 0) + 1; // Next chain order
      
      for (const vote of votes) {
        // Generate chain hash data (matching seeder logic)
        // This creates a tamper-evident chain where each vote depends on the previous vote's hash
        // Format: voterId-candidateId-positionId-timestamp-chainOrder
        const timestamp = new Date();
        const voteData = `${voter.id}-${vote.candidateId}-${vote.positionId}-${timestamp.getTime()}-${electionChainOrder}`;
        const chainData = `${voteData}-${lastVoteHash}`;
        const voteHash = crypto.createHash('sha256').update(chainData).digest('hex');
        
        // Generate HMAC signature (matching seeder logic)
        // This provides authentication using the secret key to prevent tampering
        const signature = crypto.createHmac('sha256', VOTE_SECRET)
          .update(chainData)
          .digest('hex');

        const voteResponse = await tx.voteResponse.create({
          data: {
            electionId: voter.election.id,
            voterId: voter.id,
            candidateId: vote.candidateId,
            positionId: vote.positionId,
            voteHash: voteHash,
            prevHash: lastVoteHash,
            chainOrder: electionChainOrder,
            signature: signature,
            timestamp: timestamp
          },
          include: {
            candidate: {
              select: {
                id: true,
                imageObjectKey: true,
                imageProvider: true,
                credentialObjectKey: true,
                credentialProvider: true,
                voter: {
                  select: {
                    firstName: true,
                    middleName: true,
                    lastName: true
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
            },
            position: {
              select: {
                id: true,
                name: true,
                voteLimit: true
              }
            }
          }
        });

        responses.push(voteResponse);
        
        // Update for next vote in this election's chain
        lastVoteHash = voteHash;
        electionChainOrder++;
      }

      return responses;
    });

    return apiResponse({
      success: true,
      message: "Votes submitted successfully",
      data: {
        voter: {
          id: voter.id,
          firstName: voter.firstName,
          lastName: voter.lastName
        },
        election: {
          id: voter.election.id,
          name: voter.election.name
        },
        ballotData: {
          positions: voteResponses.reduce((acc: any[], vote) => {
            // Group votes by position
            const existingPosition = acc.find(pos => pos.id === vote.position.id);
            
            const candidateData = {
              id: vote.candidate.id,
              name: `${vote.candidate.voter.firstName}${vote.candidate.voter.middleName ? ` ${vote.candidate.voter.middleName}` : ''} ${vote.candidate.voter.lastName}`,
              party: vote.candidate.party ? vote.candidate.party.name : 'Independent',
              partyColor: vote.candidate.party ? vote.candidate.party.color : '#6B7280',
              img: vote.candidate.imageObjectKey ? `/api/files/${vote.candidate.imageObjectKey}` : '/assets/sample/logo.png',
              credentialsUrl: vote.candidate.credentialObjectKey ? `/api/files/${vote.candidate.credentialObjectKey}` : undefined
            };

            if (existingPosition) {
              existingPosition.candidates.push(candidateData);
            } else {
              acc.push({
                id: vote.position.id,
                name: vote.position.name,
                maxSelections: vote.position.voteLimit,
                candidates: [candidateData]
              });
            }
            
            return acc;
          }, []),
          parties: [] // We can populate this if needed
        },
        voteCount: votes.length,
        submittedAt: new Date().toISOString()
      },
      error: null,
      status: 201
    });

  } catch (error) {
    console.error("Vote submission error:", error);
    return apiResponse({
      success: false,
      message: "Failed to submit votes",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
