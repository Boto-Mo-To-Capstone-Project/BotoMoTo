import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

// Handle POST request to verify passphrase for MFA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, passphrase } = body;

    // Validate required fields
    if (!sessionToken || !passphrase) {
      return apiResponse({
        success: false,
        message: "Session token and passphrase are required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Get and validate MFA session
    const mfaSession = await db.mfaSession.findUnique({
      where: { sessionToken },
    });

    if (!mfaSession) {
      return apiResponse({
        success: false,
        message: "Invalid session token",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check expiry
    if (mfaSession.expiresAt < new Date()) {
      await db.mfaSession.delete({
        where: { id: mfaSession.id },
      });
      
      return apiResponse({
        success: false,
        message: "MFA session expired",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Validate method is required and current
    const expectedMethod = 'passphrase-email';
    if (!mfaSession.requiredMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "Passphrase verification not required for this session",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (mfaSession.completedMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "Passphrase verification already completed",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Must complete methods in order
    const currentExpectedMethod = mfaSession.requiredMethods[mfaSession.currentStep];
    if (expectedMethod !== currentExpectedMethod) {
      return apiResponse({
        success: false,
        message: `Must complete ${currentExpectedMethod} before passphrase verification`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check passphrase in database
    const identifier = `mfa_passphrase_${mfaSession.sessionToken}`;
    
    // Normalize the passphrase input (trim and lowercase)
    const normalizedPassphrase = passphrase.trim().toLowerCase();
    
    const passphraseRecord = await db.verificationToken.findFirst({
      where: {
        identifier: identifier,
        token: normalizedPassphrase
      }
    });

    if (!passphraseRecord) {
      return apiResponse({
        success: false,
        message: "Invalid passphrase",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if passphrase has expired
    if (passphraseRecord.expires < new Date()) {
      // Clean up expired passphrase
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: identifier,
            token: normalizedPassphrase
          }
        }
      });

      return apiResponse({
        success: false,
        message: "Passphrase has expired. Please request a new one.",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Passphrase is valid - delete it (one-time use)
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: identifier,
          token: normalizedPassphrase
        }
      }
    });

    // Mark passphrase verification as completed
    const response = await fetch(`${request.nextUrl.origin}/api/mfa/complete-step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionToken,
        method: expectedMethod,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      return apiResponse({
        success: false,
        message: result.error || "Failed to complete passphrase verification",
        data: null,
        error: "Internal Server Error",
        status: 500
      });
    }

    return apiResponse({
      success: true,
      message: "Passphrase verified successfully",
      data: {
        completedMethods: result.completedMethods,
        currentStep: result.currentStep,
        nextMethod: result.nextMethod,
        isCompleted: result.isCompleted,
        finalToken: result.finalToken,
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Passphrase verification error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify passphrase",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
