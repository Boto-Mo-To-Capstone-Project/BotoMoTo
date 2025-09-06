import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { createEmailService } from "@/lib/email";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Handle POST request to send OTP via email for MFA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    // Validate required fields
    if (!sessionToken) {
      return apiResponse({
        success: false,
        message: "Session token is required",
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

    // Validate OTP method is required and current
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

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database using VerificationToken table temporarily
    const identifier = `mfa_otp_${mfaSession.sessionToken}`;
    
    // Delete any existing OTP for this session
    await db.verificationToken.deleteMany({
      where: {
        identifier: identifier
      }
    });

    // Create new OTP record
    await db.verificationToken.create({
      data: {
        identifier: identifier,
        token: otp,
        expires: expiresAt
      }
    });

    // Get voter name for email
    const voter = await db.voter.findFirst({
      where: {
        electionId: mfaSession.electionId,
        email: mfaSession.voterEmail,
        code: mfaSession.voterCode,
        isDeleted: false,
        isActive: true
      },
      select: {
        firstName: true,
        lastName: true
      }
    });

    if (!voter) {
      return apiResponse({
        success: false,
        message: "Voter not found",
        data: null,
        error: "Not Found",
        status: 404
      });
    }

    // Send OTP via email
    try {
      const emailService = createEmailService();
      
      const emailResult = await emailService.send({
        to: { email: mfaSession.voterEmail, name: voter.firstName },
        subject: "Your One-Time Password (OTP) for Election Access",
        text: `Hello ${voter.firstName},\n\nYour OTP for election access is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nDo not share this code with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Election Access - One-Time Password</h2>
            <p>Hello ${voter.firstName},</p>
            <p>Your OTP for election access is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px;">${otp}</span>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p style="color: #e74c3c;"><strong>Important:</strong> Do not share this code with anyone.</p>
            <p>If you did not request this OTP, please ignore this email.</p>
          </div>
        `
      });

      console.log('[MFA OTP] Email sent successfully:', emailResult);

    } catch (emailError) {
      console.error('[MFA OTP] Failed to send email:', emailError);
      
      // Clean up OTP record since email failed
      await db.verificationToken.deleteMany({
        where: {
          identifier: identifier
        }
      });

      return apiResponse({
        success: false,
        message: "Failed to send OTP email",
        data: null,
        error: "Email Service Error",
        status: 500
      });
    }

    // Update session last active time
    await db.mfaSession.update({
      where: { id: mfaSession.id },
      data: { lastActiveAt: new Date() },
    });

    return apiResponse({
      success: true,
      message: "OTP sent successfully to your email address",
      data: {
        email: mfaSession.voterEmail,
        expiresAt: expiresAt
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    return apiResponse({
      success: false,
      message: "Failed to send OTP",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
