import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import { z } from 'zod';

// Initialize or retrieve MFA session
const InitSessionSchema = z.object({
  electionId: z.number(),
  voterEmail: z.string().email(),
  voterCode: z.string(),
});

const GetSessionSchema = z.object({
  sessionToken: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { electionId, voterEmail, voterCode } = InitSessionSchema.parse(body);

    // Verify voter exists and is valid
    const voter = await db.voter.findFirst({
      where: {
        electionId,
        email: voterEmail,
        code: voterCode,
        isActive: true,
        isDeleted: false,
      },
      include: {
        election: {
          include: {
            mfaSettings: true,
          },
        },
      },
    });

    if (!voter) {
      return NextResponse.json(
        { error: 'Invalid voter credentials' },
        { status: 401 }
      );
    }

    if (!voter.election.mfaSettings?.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA not enabled for this election' },
        { status: 400 }
      );
    }

    // Get required MFA methods in canonical order
    const requiredMethods = voter.election.mfaSettings.mfaMethods;
    
    if (requiredMethods.length === 0) {
      return NextResponse.json(
        { error: 'No MFA methods configured' },
        { status: 400 }
      );
    }

    // Check if session already exists
    const existingSession = await db.mfaSession.findUnique({
      where: {
        electionId_voterEmail: {
          electionId,
          voterEmail,
        },
      },
    });

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    let mfaSession;

    if (existingSession) {
      // Update existing session
      mfaSession = await db.mfaSession.update({
        where: { id: existingSession.id },
        data: {
          sessionToken,
          expiresAt,
          lastActiveAt: new Date(),
          // Reset progress if methods changed
          requiredMethods,
          completedMethods: [],
          currentStep: 0,
          isCompleted: false,
        },
      });
    } else {
      // Create new session
      mfaSession = await db.mfaSession.create({
        data: {
          electionId,
          voterEmail,
          voterCode,
          requiredMethods,
          sessionToken,
          expiresAt,
        },
      });
    }

    return NextResponse.json({
      sessionToken: mfaSession.sessionToken,
      requiredMethods: mfaSession.requiredMethods,
      currentStep: mfaSession.currentStep,
      totalSteps: mfaSession.requiredMethods.length,
      isCompleted: mfaSession.isCompleted,
    });

  } catch (error) {
    console.error('MFA session initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize MFA session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionToken = url.searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 400 }
      );
    }

    const { sessionToken: validatedToken } = GetSessionSchema.parse({ sessionToken });

    // Get session and check validity
    const mfaSession = await db.mfaSession.findUnique({
      where: { sessionToken: validatedToken },
      include: {
        election: {
          include: {
            mfaSettings: true,
          },
        },
      },
    });

    if (!mfaSession) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Check expiry
    if (mfaSession.expiresAt < new Date()) {
      // Clean up expired session
      await db.mfaSession.delete({
        where: { id: mfaSession.id },
      });
      
      return NextResponse.json(
        { error: 'MFA session expired' },
        { status: 401 }
      );
    }

    // Update last active time
    await db.mfaSession.update({
      where: { id: mfaSession.id },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({
      sessionToken: mfaSession.sessionToken,
      electionId: mfaSession.electionId,
      voterEmail: mfaSession.voterEmail,
      requiredMethods: mfaSession.requiredMethods,
      completedMethods: mfaSession.completedMethods,
      currentStep: mfaSession.currentStep,
      totalSteps: mfaSession.requiredMethods.length,
      isCompleted: mfaSession.isCompleted,
      expiresAt: mfaSession.expiresAt,
    });

  } catch (error) {
    console.error('MFA session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MFA session' },
      { status: 500 }
    );
  }
}
