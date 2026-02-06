import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

// Handle POST request to verify OTP for MFA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, otp } = body;

    // Validate required fields
    if (!sessionToken || !otp) {
      return apiResponse({
        success: false,
        message: "Session token and OTP are required",
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
    const expectedMethod = 'otp-email';
    if (!mfaSession.requiredMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "OTP verification not required for this session",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (mfaSession.completedMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "OTP verification already completed",
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
        message: `Must complete ${currentExpectedMethod} before OTP verification`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check OTP in database
    const identifier = `mfa_otp_${mfaSession.sessionToken}`;
    const otpRecord = await db.verificationToken.findFirst({
      where: {
        identifier: identifier,
        token: otp.toString()
      }
    });

    if (!otpRecord) {
      return apiResponse({
        success: false,
        message: "Invalid OTP",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if OTP has expired
    if (otpRecord.expires < new Date()) {
      // Clean up expired OTP
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: identifier,
            token: otp.toString()
          }
        }
      });

      return apiResponse({
        success: false,
        message: "OTP has expired. Please request a new one.",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // OTP is valid - delete it (one-time use)
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: identifier,
          token: otp.toString()
        }
      }
    });

    // Mark OTP verification as completed
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
        message: result.error || "Failed to complete OTP verification",
        data: null,
        error: "Internal Server Error",
        status: 500
      });
    }

    return apiResponse({
      success: true,
      message: "OTP verified successfully",
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
    console.error("OTP verification error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify OTP",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
