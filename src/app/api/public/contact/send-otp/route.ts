import { NextRequest } from "next/server";
import db from "@/lib/db/db";
import { apiResponse } from "@/lib/apiResponse";
import { createEmailService } from "@/lib/email";
import { consumeRateLimit, getClientIp, secondsFromMs } from "@/lib/contact/rateLimit";
import { CONTACT_OTP_TTL_MS, sendOtpSchema } from "@/lib/contact/validation";

type OtpTokenPayload = {
  otp: string;
  attempts: number;
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return apiResponse({
        success: false,
        message: "Please enter a valid email address.",
        error: parsed.error.format(),
        status: 400,
      });
    }

    const { email } = parsed.data;
    const ip = getClientIp(request.headers);

    const ipLimit = consumeRateLimit(`contact:send-otp:ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return apiResponse({
        success: false,
        message: `Too many OTP requests. Try again in ${secondsFromMs(ipLimit.retryAfterMs)} seconds.`,
        status: 429,
      });
    }

    const emailLimit = consumeRateLimit(`contact:send-otp:email:${email}`, 3, 10 * 60 * 1000);
    if (!emailLimit.allowed) {
      return apiResponse({
        success: false,
        message: `OTP was requested too frequently for this email. Try again in ${secondsFromMs(emailLimit.retryAfterMs)} seconds.`,
        status: 429,
      });
    }

    const otp = generateOtp();
    const identifier = `contact_otp_${email}`;
    const expiresAt = new Date(Date.now() + CONTACT_OTP_TTL_MS);
    const tokenPayload: OtpTokenPayload = { otp, attempts: 0 };

    await db.verificationToken.deleteMany({ where: { identifier } });

    await db.verificationToken.create({
      data: {
        identifier,
        token: JSON.stringify(tokenPayload),
        expires: expiresAt,
      },
    });

    const emailService = createEmailService();

    await emailService.send({
      to: { email },
      subject: "Your Contact Form Verification Code",
      text: `Your OTP is ${otp}. It will expire in 10 minutes. If you did not request this code, ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2>Contact Form Verification</h2>
          <p>Use this one-time password to verify your email before submitting your contact message:</p>
          <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center;">
            <span style="font-size: 28px; letter-spacing: 4px; font-weight: 700;">${otp}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not request this code, you can ignore this message.</p>
        </div>
      `,
    });

    return apiResponse({
      success: true,
      message: "OTP sent to your email.",
      data: { expiresAt },
      status: 200,
    });
  } catch (error) {
    console.error("[Public Contact Send OTP] Error:", error);
    return apiResponse({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
}
