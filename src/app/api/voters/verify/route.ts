import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { isValidVoterCodeFormat } from "@/lib/utils";

// Handle POST request to verify voter code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    // Validate required fields
    if (!code) {
      return apiResponse({
        success: false,
        message: "Voter code is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate code format
    if (!isValidVoterCodeFormat(code)) {
      return apiResponse({
        success: false,
        message: "Invalid voter code format. Code must be 6 digits.",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Find voter by code
    const voter = await db.voter.findUnique({
      where: { 
        code: code.toString()
      },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            status: true,
            isLive: true,
            isDeleted: true,
            schedule: {
              select: {
                dateStart: true,
                dateFinish: true
              }
            },
            mfaSettings: {
              select: {
                mfaEnabled: true,
                mfaMethod: true
              }
            }
          }
        },
        votingScope: {
          select: {
            id: true,
            name: true,
          }
        },
        voteResponses: {
          where: { electionId: { not: undefined as any } },
          select: { id: true, timestamp: true },
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    // Check if voter exists
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

    // Compute voted status from latest vote
    const latestVote = voter.voteResponses[0];
    const hasVoted = !!latestVote;

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
        data: {
          voter: {
            id: voter.id,
            firstName: voter.firstName,
            lastName: voter.lastName,
            voted: hasVoted
          },
          election: {
            id: voter.election.id,
            name: voter.election.name,
            status: voter.election.status
          }
        },
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
          data: {
            voter: {
              id: voter.id,
              firstName: voter.firstName,
              lastName: voter.lastName,
              voted: hasVoted
            },
            election: {
              id: voter.election.id,
              name: voter.election.name,
              status: voter.election.status,
              startDate: voter.election.schedule.dateStart,
              endDate: voter.election.schedule.dateFinish
            }
          },
          error: "Election Not Started",
          status: 403
        });
      }

      if (now > endDate) {
        return apiResponse({
          success: false,
          message: `Election ended on ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}`,
          data: {
            voter: {
              id: voter.id,
              firstName: voter.firstName,
              lastName: voter.lastName,
              voted: hasVoted
            },
            election: {
              id: voter.election.id,
              name: voter.election.name,
              status: voter.election.status,
              startDate: voter.election.schedule.dateStart,
              endDate: voter.election.schedule.dateFinish
            }
          },
          error: "Election Ended",
          status: 403
        });
      }
    }

    // Check if voter has already voted
    if (hasVoted) {
      return apiResponse({
        success: false,
        message: "You have already voted in this election.",
        data: {
          voter: {
            id: voter.id,
            firstName: voter.firstName,
            lastName: voter.lastName,
            voted: hasVoted
          },
          election: {
            id: voter.election.id,
            name: voter.election.name,
            status: voter.election.status
          }
        },
        error: "Already Voted",
        status: 403
      });
    }

    // Mark voter as verified (first time verification)
    if (!voter.isVerified) {
      await db.voter.update({
        where: { id: voter.id },
        data: { isVerified: true }
      });
    }

    // Return successful verification
    return apiResponse({
      success: true,
      message: "Voter code verified successfully",
      data: {
        voter: {
          id: voter.id,
          code: voter.code,
          firstName: voter.firstName,
          middleName: voter.middleName,
          lastName: voter.lastName,
          email: voter.email,
          isVerified: true,
          voted: hasVoted,
          votingScope: voter.votingScope
        },
        election: {
          id: voter.election.id,
          name: voter.election.name,
          status: voter.election.status,
          isLive: voter.election.isLive,
          mfaSettings: voter.election.mfaSettings,
          schedule: voter.election.schedule
        }
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Voter code verification error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify voter code",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
