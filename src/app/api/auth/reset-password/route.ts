import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import bcrypt from "bcryptjs";

// Handle POST request to verify OTP and reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    // Validate required fields
    if (!email || !otp || !newPassword) {
      return apiResponse({
        success: false,
        message: "Email, OTP, and new password are required",
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

    // Validate password strength
    if (newPassword.length < 8) {
      return apiResponse({
        success: false,
        message: "Password must be at least 8 characters long",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return apiResponse({
        success: false,
        message: "Invalid OTP format",
        data: null,
        error: "Bad Request",
        status: 400
      });
    }

    // Find and validate OTP
    const identifier = `forgot_password_${email.toLowerCase()}`;
    const otpRecord = await db.verificationToken.findFirst({
      where: {
        identifier: identifier
      }
    });

    if (!otpRecord) {
      return apiResponse({
        success: false,
        message: "Invalid or expired OTP",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Check if OTP has expired
    if (otpRecord.expires < new Date()) {
      // Clean up expired OTP
      await db.verificationToken.deleteMany({
        where: {
          identifier: identifier
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

    // Parse stored token data
    let tokenData;
    try {
      tokenData = JSON.parse(otpRecord.token);
    } catch {
      return apiResponse({
        success: false,
        message: "Invalid OTP data",
        data: null,
        error: "Internal Server Error",
        status: 500
      });
    }

    // Verify OTP matches
    if (tokenData.otp !== otp) {
      return apiResponse({
        success: false,
        message: "Invalid OTP",
        data: null,
        error: "Unauthorized",
        status: 401
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password based on user type
    try {
      if (tokenData.userType === 'voter') {
        // Voters don't have passwords - they use voting codes
        // This should not happen in normal flow, but handle gracefully
        return apiResponse({
          success: false,
          message: "Voters cannot reset passwords. Please contact support for voting code assistance.",
          data: null,
          error: "Invalid Operation",
          status: 400
        });
      } else {
        // For admin users and super admins, update the User table
        await db.user.update({
          where: {
            id: tokenData.userId,
            email: email.toLowerCase(),
            isDeleted: false
          },
          data: {
            password: hashedPassword,
            updatedAt: new Date()
          }
        });
      }
    } catch (updateError) {
      console.error("Password update error:", updateError);
      return apiResponse({
        success: false,
        message: "Failed to update password. User may not exist or be inactive.",
        data: null,
        error: "Update Failed",
        status: 400
      });
    }

    // Clean up the used OTP
    await db.verificationToken.deleteMany({
      where: {
        identifier: identifier
      }
    });

    // Log the password reset for audit purposes
    try {
      // You can add audit logging here if needed
      console.log(`Password reset successful for user: ${email}, type: ${tokenData.userType}`);
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error("Audit logging error:", auditError);
    }

    return apiResponse({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
      data: {
        email: email.toLowerCase(),
        userType: tokenData.userType
      },
      error: null,
      status: 200
    });

  } catch (error) {
    console.error("Reset password error:", error);
    return apiResponse({
      success: false,
      message: "Failed to reset password",
      data: null,
      error: typeof error === "string" ? error : "Internal server error",
      status: 500
    });
  }
}
