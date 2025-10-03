import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db/db";
import { v4 as uuidv4 } from "uuid";
import { isValidVoterCodeFormat } from "@/lib/utils";

const VOTER_SESSION_COOKIE = "voter_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  let voter: any = null; // Declare voter variable for error handling
  
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Voter code is required" }, { status: 400 });
    }

    // Validate code format
    if (!isValidVoterCodeFormat(code)) {
      return NextResponse.json({ error: "Invalid voter code format. Code must be 6 digits." }, { status: 400 });
    }

    // Find voter by code with all necessary includes
    voter = await db.voter.findUnique({
      where: { 
        code: code.toString()
      },
      include: {
        election: {
          include: {
            schedule: {
              select: {
                dateStart: true,
                dateFinish: true
              }
            },
            mfaSettings: {
              select: {
                mfaEnabled: true,
                mfaMethods: true
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

    // Check if voter exists and is not deleted
    if (!voter || voter.isDeleted) {
      return NextResponse.json({ error: "Invalid voter code" }, { status: 404 });
    }

    // Check if election exists and is not deleted
    if (!voter.election || voter.election.isDeleted) {
      return NextResponse.json({ error: "Election not found or has been deleted" }, { status: 404 });
    }

    // Check if voter is active
    if (!voter.isActive) {
      return NextResponse.json({ error: "Voter account is inactive. Please contact election administrators." }, { status: 403 });
    }

    // Compute voted status from latest vote
    const latestVote = voter.voteResponses[0];
    const hasVoted = !!latestVote;

    // PRIORITY CHECK: If voter has already voted, allow them to login regardless of multiple sessions
    // They should be able to access survey, receipt, and live results from any device after voting
    if (hasVoted) {
      console.log(`Voter ${voter.code} has already voted - allowing login for post-vote activities`);
      
      // Check if they already have an active session
      const existingSession = await db.voterSession.findFirst({
        where: { 
          voterId: voter.id, 
          isActive: true, 
          expires: { gte: new Date() } 
        }
      });
      
      if (existingSession) {
        console.log(`✅ Using existing active session for voted user: ${existingSession.sessionToken.substring(0, 8)}...`);
        
        // Update last active time
        await db.voterSession.update({
          where: { id: existingSession.id },
          data: { lastActiveAt: new Date() }
        });
        
        // Set the existing session cookie
        const cookieStore = await cookies();
        cookieStore.set(VOTER_SESSION_COOKIE, existingSession.sessionToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          expires: existingSession.expires,
        });
        
        return NextResponse.json({ 
          success: true, 
          message: "Login successful - using existing session",
          data: {
            voter: {
              id: voter.id,
              code: voter.code,
              firstName: voter.firstName,
              middleName: voter.middleName,
              lastName: voter.lastName,
              email: voter.email,
              voted: true,
              votingScope: voter.votingScope
            },
            election: {
              id: voter.election.id,
              name: voter.election.name,
              status: voter.election.status,
              mfaSettings: voter.election.mfaSettings,
              schedule: voter.election.schedule
            },
            ballotData: null // No need for ballot data if already voted
          }
        });
      }
      
      // Create new session for voted user (don't clear existing sessions from other activities)
      const sessionToken = uuidv4();
      const expires = new Date(Date.now() + SESSION_DURATION_MS);

      const newSession = await db.voterSession.create({
        data: {
          sessionToken,
          voterId: voter.id,
          expires,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });

      console.log(`✅ Created new session for voted user: ${sessionToken.substring(0, 8)}... (ID: ${newSession.id})`);

      // Set HttpOnly cookie for post-vote activities
      const cookieStore = await cookies();
      cookieStore.set(VOTER_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires,
      });
      
      console.log(`🍪 Set cookie for voted user: ${sessionToken.substring(0, 8)}...`);

      return NextResponse.json({ 
        success: true, 
        message: "Login successful - redirecting to results",
        data: {
          voter: {
            id: voter.id,
            code: voter.code,
            firstName: voter.firstName,
            middleName: voter.middleName,
            lastName: voter.lastName,
            email: voter.email,
            voted: true,
            votingScope: voter.votingScope
          },
          election: {
            id: voter.election.id,
            name: voter.election.name,
            status: voter.election.status,
            mfaSettings: voter.election.mfaSettings,
            schedule: voter.election.schedule
          },
          ballotData: null // No need for ballot data if already voted
        }
      });
    }

    console.log(`Voter ${voter.code} has not voted yet - proceeding with normal login flow`);

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
      return NextResponse.json({ error: message }, { status: 403 });
    }

    // Check election schedule if available
    if (voter.election.schedule) {
      const now = new Date();
      const startDate = new Date(voter.election.schedule.dateStart);
      const endDate = new Date(voter.election.schedule.dateFinish);

      // this condition can now be deleted
      if (now < startDate) {
        console.log(`Election is active but has not started yet. Allowing session creation for voter ${voter.code}`);
        // 👉 Let the flow continue to session creation
      }

      if (now > endDate) {
        return NextResponse.json({ 
          error: `Election ended on ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}` 
        }, { status: 403 });
      }
    }

    // Prevent multiple active sessions using row-level locking (cleanest approach)
    const result = await db.$transaction(async (tx) => {
      // 🔒 Lock the voter row to prevent concurrent session creation
      const lockedVoter = await tx.voter.findUniqueOrThrow({
        where: { id: voter.id },
        include: {
          voterSessions: {
            where: {
              isActive: true,
              expires: { gte: new Date() }
            }
          }
        }
      });

      // Check if there are any active sessions while holding the lock
      if (lockedVoter.voterSessions.length > 0) {
        throw new Error("CONCURRENT_SESSION_DETECTED");
      }

      // Deactivate any existing sessions (cleanup)
      await tx.voterSession.updateMany({
        where: {
          voterId: voter.id,
          isActive: true
        },
        data: { isActive: false }
      });

      // Create new session while holding the lock
      const sessionToken = uuidv4();
      const expires = new Date(Date.now() + SESSION_DURATION_MS);

      const newSession = await tx.voterSession.create({
        data: {
          sessionToken,
          voterId: voter.id,
          expires,
          isActive: true,
          lastActiveAt: new Date(),
          mfaCompleted: false, // Will be set to true after MFA completion or if no MFA required
        },
      });

      return { sessionToken, expires, newSession };
    }, {
      isolationLevel: 'Serializable', // Strongest isolation level for maximum safety
      timeout: 10000 // 10 second timeout
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Fetch ballot data for the voter's election and voting scope
    const positions = await db.position.findMany({
      where: {
        electionId: voter.election.id,
        OR: [
          { votingScopeId: voter.votingScopeId },
          { votingScopeId: null } // Include positions without specific voting scope
        ],
        isDeleted: false
      },
      orderBy: { order: 'asc' },
      include: {
        candidates: {
          where: { isDeleted: false },
          include: {
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
        }
      }
    });

    // Fetch all parties for the election
    const parties = await db.party.findMany({
      where: {
        electionId: voter.election.id,
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        color: true
      }
    });

    // Transform ballot data to match the expected format
    const ballotData = {
      positions: positions
        .filter(position => position.candidates.length > 0)
        .map(position => ({
          id: position.id,
          name: position.name,
          maxSelections: position.voteLimit,
          candidates: position.candidates.map(candidate => ({
            id: candidate.id,
            name: `${candidate.voter.firstName}${candidate.voter.middleName ? ` ${candidate.voter.middleName}` : ''} ${candidate.voter.lastName}`,
            party: candidate.party ? candidate.party.name : 'Independent',
            partyColor: candidate.party ? candidate.party.color : '#6B7280',
            img: candidate.imageObjectKey ? `/api/files/${candidate.imageObjectKey}` : 'assets/sample/logo.png',
            credentialsUrl: candidate.credentialObjectKey ? `/api/files/${candidate.credentialObjectKey}` : undefined
          }))
        })),
      parties: parties.map(party => party.name)
    };

    // Set HttpOnly cookie using the session token from the transaction
    const cookieStore = await cookies();
    cookieStore.set(VOTER_SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: result.expires,
    });

    // Check if MFA is required for this election
    const mfaRequired = voter.election.mfaSettings?.mfaEnabled && 
                       voter.election.mfaSettings.mfaMethods?.length > 0;

    // If no MFA required, mark session as MFA completed
    if (!mfaRequired) {
      await db.voterSession.update({
        where: { sessionToken: result.sessionToken },
        data: { mfaCompleted: true }
      });
    }

    const voterData = {
      id: String(voter.id),
      voterId: String(voter.id),
      voterCode: voter.code,
      name: `${voter.firstName} ${voter.lastName}`,
      email: voter.email,
      election: voter.election,
      votingScope: voter.votingScope,
      mfaRequired: mfaRequired // Include MFA requirement in response
    };

    return NextResponse.json({ 
      success: true, 
      message: "Login successful",
      data: {
        voter: {
          id: voter.id,
          code: voter.code,
          firstName: voter.firstName,
          middleName: voter.middleName,
          lastName: voter.lastName,
          email: voter.email,
          voted: hasVoted,
          votingScope: voter.votingScope
        },
        election: {
          id: voter.election.id,
          name: voter.election.name,
          status: voter.election.status,
          mfaSettings: voter.election.mfaSettings,
          schedule: voter.election.schedule
        },
        ballotData
      }
    });
  } catch (e: any) {
    console.error("Error creating voter session:", e);
    
    // Handle specific transaction errors with detailed logging
    if (e.message === "MULTIPLE_SESSIONS_DETECTED") {
      console.log(`🚫 Multiple session attempt blocked for voter ${voter?.code}`);
      return NextResponse.json({ 
        error: "This voter code is already in use on another device. Only one session per voter is allowed." 
      }, { status: 409 });
    }
    
    if (e.message === "CONCURRENT_SESSION_DETECTED") {
      console.log(`🚫 Concurrent session attempt blocked for voter ${voter?.code}`);
      return NextResponse.json({ 
        error: "This voter code is already logged in on another device. Please try again in a moment." 
      }, { status: 409 });
    }
    
    if (e.message === "SESSION_CREATION_CONFLICT") {
      console.log(`⚠️ Session creation conflict for voter ${voter?.code}`);
      return NextResponse.json({ 
        error: "Login conflict detected. Please try again in a moment." 
      }, { status: 409 });
    }

    if (e.message === "VOTER_NOT_FOUND") {
      return NextResponse.json({ 
        error: "Voter session error. Please try logging in again." 
      }, { status: 400 });
    }

    // Handle transaction timeout
    if (e.code === 'P2034' || e.message.includes('timeout')) {
      console.log(`⏰ Transaction timeout for voter ${voter?.code}`);
      return NextResponse.json({ 
        error: "Login is taking too long. Please try again." 
      }, { status: 408 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
