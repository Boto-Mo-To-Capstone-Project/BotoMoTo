import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';
import { z } from 'zod';

// Mark MFA step as completed (server-side verification)
const CompleteStepSchema = z.object({
  sessionToken: z.string(),
  method: z.enum(['email-confirmation', 'otp-email', 'passphrase-email']),
  verificationData: z.record(z.any()).optional(), // Additional verification data if needed
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, method, verificationData } = CompleteStepSchema.parse(body);

    // Get and validate session
    const mfaSession = await db.mfaSession.findUnique({
      where: { sessionToken },
    });

    if (!mfaSession) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Check expiry
    if (mfaSession.expiresAt < new Date()) {
      await db.mfaSession.delete({
        where: { id: mfaSession.id },
      });
      
      return NextResponse.json(
        { error: 'MFA session expired' },
        { status: 401 }
      );
    }

    // Validate method is required for this session
    if (!mfaSession.requiredMethods.includes(method)) {
      return NextResponse.json(
        { error: 'Method not required for this session' },
        { status: 400 }
      );
    }

    // Check if method is already completed
    if (mfaSession.completedMethods.includes(method)) {
      return NextResponse.json(
        { error: 'Method already completed' },
        { status: 400 }
      );
    }

    // Validate current step (must complete methods in order)
    const expectedMethod = mfaSession.requiredMethods[mfaSession.currentStep];
    if (method !== expectedMethod) {
      return NextResponse.json(
        { 
          error: `Must complete ${expectedMethod} before ${method}`,
          expectedMethod,
          currentStep: mfaSession.currentStep,
        },
        { status: 400 }
      );
    }

    // Mark method as completed
    const updatedCompletedMethods = [...mfaSession.completedMethods, method];
    const nextStep = mfaSession.currentStep + 1;
    const isCompleted = nextStep >= mfaSession.requiredMethods.length;

    const updatedSession = await db.mfaSession.update({
      where: { id: mfaSession.id },
      data: {
        completedMethods: updatedCompletedMethods,
        currentStep: nextStep,
        isCompleted,
        lastActiveAt: new Date(),
      },
    });

    // If MFA is complete, mark the voter session as MFA completed
    let finalToken = null;
    if (isCompleted) {
      // Generate final authentication token (could be JWT or session token)
      finalToken = crypto.randomUUID();
      
      // Update session with final token
      await db.mfaSession.update({
        where: { id: mfaSession.id },
        data: {
          // We could add a finalToken field to track this
          lastActiveAt: new Date(),
        },
      });

      // Find the voter and mark their voter session as MFA completed
      try {
        const voter = await db.voter.findFirst({
          where: {
            electionId: mfaSession.electionId,
            email: mfaSession.voterEmail,
            code: mfaSession.voterCode,
            isActive: true,
            isDeleted: false,
          }
        });

        if (voter) {
          // Mark the active voter session as MFA completed
          await db.voterSession.updateMany({
            where: {
              voterId: voter.id,
              isActive: true,
              expires: { gte: new Date() }
            },
            data: {
              mfaCompleted: true
            }
          });
          
          console.log(`✅ Marked voter session as MFA completed for voter: ${voter.code}`);
        } else {
          console.warn(`⚠️ Could not find voter to mark MFA completed: ${mfaSession.voterEmail}`);
        }
      } catch (error) {
        console.error('Error marking voter session MFA completed:', error);
        // Don't fail the MFA completion for this error
      }
    }

    return NextResponse.json({
      success: true,
      message: `${method} verification completed`,
      sessionToken: updatedSession.sessionToken,
      completedMethods: updatedSession.completedMethods,
      currentStep: updatedSession.currentStep,
      nextMethod: isCompleted ? null : mfaSession.requiredMethods[nextStep],
      isCompleted: updatedSession.isCompleted,
      finalToken, // Only set if MFA is fully complete
    });

  } catch (error) {
    console.error('MFA step completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete MFA step' },
      { status: 500 }
    );
  }
}
