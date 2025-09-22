import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { createEmailService } from "@/lib/email";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Handle POST request to send password reset OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return apiResponse({
        success: false,
        message: "Email is required",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiResponse({
        success: false,
        message: "Invalid email format",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Check if user exists (only check User table since voters don't have passwords)
    const user = await db.user.findFirst({
      where: { 
        email: email.toLowerCase(),
        isDeleted: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      // Return success even if user doesn't exist for security reasons
      return apiResponse({
        success: true,
        message: "If the email exists in our system, you will receive a password reset code shortly.",
        data: null,
        error: null,
        status: 200
      });
    }

    // Get the display name and email for the found user
    const displayName = user.name || 'User';
    const userEmail = user.email || email;
    const userType = user.role.toLowerCase();

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in database using VerificationToken table
    const identifier = `forgot_password_${email.toLowerCase()}`;
    
    // Delete any existing OTP for this email
    await db.verificationToken.deleteMany({
      where: {
        identifier: identifier
      }
    });

    // Create new OTP record with additional metadata
    await db.verificationToken.create({
      data: {
        identifier: identifier,
        token: JSON.stringify({
          otp: otp,
          email: email.toLowerCase(),
          userType: userType,
          userId: user.id
        }),
        expires: expiresAt
      }
    });

    // Send OTP via email
    try {
      const emailService = createEmailService();
      
      const emailResult = await emailService.send({
        to: { email: userEmail, name: displayName },
        subject: "Password Reset - One-Time Password",
        text: `Hello ${displayName},\n\nYour password reset OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nDo not share this code with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${displayName},</p>
            <p>You have requested to reset your password. Please use the following One-Time Password (OTP) to continue:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #2563eb;">${otp}</span>
            </div>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p style="color: #e74c3c;"><strong>Security Notice:</strong></p>
            <ul style="color: #666;">
              <li>Do not share this code with anyone</li>
              <li>Our support team will never ask for this code</li>
              <li>If you did not request this password reset, please ignore this email</li>
            </ul>
            <p>If you continue to receive unwanted emails, please contact our support team.</p>
          </div>
        `
      });

      console.log('[Forgot Password] Email sent successfully:', emailResult);

    } catch (emailError) {
      console.error('[Forgot Password] Failed to send email:', emailError);
      
      // Clean up OTP record since email failed
      await db.verificationToken.deleteMany({
        where: {
          identifier: identifier
        }
      });

      return apiResponse({
        success: false,
        message: "Failed to send password reset email. Please try again later.",
        data: null,
        error: "Email Service Error",
        status: 500
      });
    }

    return apiResponse({
      success: true,
      message: "Password reset code sent successfully to your email address.",
      data: {
        email: userEmail,
        expiresAt: expiresAt
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return apiResponse({
      success: false,
      message: "Failed to process password reset request",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
