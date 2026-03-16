import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { consumeRateLimit, getClientIp, secondsFromMs } from "@/lib/contact/rateLimit";
import { CONTACT_OTP_MAX_ATTEMPTS, CONTACT_VERIFIED_TTL_MS, verifyOtpSchema } from "@/lib/contact/validation";

type OtpTokenPayload = {
  otp: string;
  attempts: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return apiResponse({
        success: false,
        message: "Invalid email or OTP format.",
        error: parsed.error.format(),
        status: 400,
      });
    }

    const { email, otp } = parsed.data;
    const ip = getClientIp(request.headers);

    const ipLimit = consumeRateLimit(`contact:verify-otp:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return apiResponse({
        success: false,
        message: `Too many verification attempts. Try again in ${secondsFromMs(ipLimit.retryAfterMs)} seconds.`,
        status: 429,
      });
    }

    const identifier = `contact_otp_${email}`;
    const otpRecord = await db.verificationToken.findFirst({ where: { identifier } });

    if (!otpRecord) {
      return apiResponse({
        success: false,
        message: "No OTP request found for this email. Please request a new code.",
        status: 400,
      });
    }

    if (otpRecord.expires < new Date()) {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return apiResponse({
        success: false,
        message: "OTP has expired. Please request a new code.",
        status: 400,
      });
    }

    let parsedToken: OtpTokenPayload;
    try {
      parsedToken = JSON.parse(otpRecord.token) as OtpTokenPayload;
    } catch {
      await db.verificationToken.deleteMany({ where: { identifier } });
      return apiResponse({
        success: false,
        message: "OTP payload is invalid. Please request a new code.",
        status: 400,
      });
    }

    if (parsedToken.otp !== otp) {
      const nextAttempts = (parsedToken.attempts || 0) + 1;

      await db.verificationToken.deleteMany({ where: { identifier } });

      if (nextAttempts >= CONTACT_OTP_MAX_ATTEMPTS) {
        return apiResponse({
          success: false,
          message: "OTP has expired. Please request a new code.",
          status: 429,
        });
      }

      await db.verificationToken.create({
        data: {
          identifier,
          token: JSON.stringify({ ...parsedToken, attempts: nextAttempts }),
          expires: otpRecord.expires,
        },
      });

      return apiResponse({
        success: false,
        message: `Incorrect OTP. You have ${CONTACT_OTP_MAX_ATTEMPTS - nextAttempts} attempt(s) left.`,
        status: 400,
      });
    }

    await db.verificationToken.deleteMany({ where: { identifier } });

    const verificationToken = crypto.randomUUID();
    const verifiedIdentifier = `contact_verified_${email}`;
    const expires = new Date(Date.now() + CONTACT_VERIFIED_TTL_MS);

    await db.verificationToken.deleteMany({ where: { identifier: verifiedIdentifier } });
    await db.verificationToken.create({
      data: {
        identifier: verifiedIdentifier,
        token: verificationToken,
        expires,
      },
    });

    return apiResponse({
      success: true,
      message: "Email verified successfully.",
      data: {
        verificationToken,
        expiresAt: expires,
      },
      status: 200,
    });
  } catch (error) {
    console.error("[Public Contact Verify OTP] Error:", error);
    return apiResponse({
      success: false,
      message: "Failed to verify OTP. Please try again.",
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
}
