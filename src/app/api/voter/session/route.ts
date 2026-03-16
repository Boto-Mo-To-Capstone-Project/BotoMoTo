import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db/db";

const VOTER_SESSION_COOKIE = "voter_session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(VOTER_SESSION_COOKIE)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const session = await db.voterSession.findFirst({
      where: { sessionToken, isActive: true },
      include: {
        voter: {
          include: {
            election: {
              include: {
                schedule: true,
                mfaSettings: true,
                organization: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            votingScope: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }
    
    if (session.expires < new Date()) {
      // Mark inactive if expired
      await db.voterSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Update last active
    await db.voterSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    const v = session.voter;
    
    // Check if voter has already voted - only fetch ballot data if not voted
    const hasVoted = await db.voteResponse.findFirst({
      where: { voterId: v.id, electionId: v.election.id }
    });

    let ballotData = null;
    
    // Only fetch ballot data for voters who haven't voted yet
    if (!hasVoted) {
      try {
        // Fetch ballot data for the voter's election and voting scope
        const positions = await db.position.findMany({
          where: {
            electionId: v.election.id,
            OR: [
              { votingScopeId: v.votingScopeId },
              { votingScopeId: null }
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
            electionId: v.election.id,
            isDeleted: false
          },
          select: {
            id: true,
            name: true,
            color: true
          }
        });

        // Transform ballot data to match expected format
        ballotData = {
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
      } catch (ballotError) {
        console.error("Error fetching ballot data:", ballotError);
        // Continue without ballot data rather than failing the entire request
        ballotData = { positions: [], parties: [] };
      }
    }

    const voter = {
      id: String(v.id),
      voterId: String(v.id),
      voterCode: v.code,
      name: `${v.firstName} ${v.lastName}`,
      organizationName: v.election.organization?.name ?? null,
      email: v.email,
      election: v.election,
      votingScope: v.votingScope,
      voted: !!hasVoted, // Add voted status to session response
      ballotData: ballotData, // Include ballot data in session response
      mfaCompleted: session.mfaCompleted // Include MFA completion status
    };

    return NextResponse.json({ voter });
  } catch (e) {
    console.error("Error getting voter session:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
