import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";

// Handle POST request to verify email for MFA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken, email } = body;

    // Validate required fields
    if (!sessionToken || !email) {
      return apiResponse({
        success: false,
        message: "Session token and email are required",
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
    const expectedMethod = 'email-confirmation';
    if (!mfaSession.requiredMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "Email confirmation not required for this session",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    if (mfaSession.completedMethods.includes(expectedMethod)) {
      return apiResponse({
        success: false,
        message: "Email confirmation already completed",
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
        message: `Must complete ${currentExpectedMethod} before email confirmation`,
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Compare entered email with session email
    if (email.toLowerCase() !== mfaSession.voterEmail.toLowerCase()) {
      return apiResponse({
        success: false,
        message: "Email address does not match your registered email",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Mark email confirmation as completed
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
        message: result.error || "Failed to complete email verification",
        data: null,
        error: "Internal Server Error",
        status: 500
      });
    }

    return apiResponse({
      success: true,
      message: "Email confirmed successfully",
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
    console.error("Email confirmation error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify email",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
