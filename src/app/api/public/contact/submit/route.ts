import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import db from "@/lib/db/db";
import { createEmailService } from "@/lib/email";
import { parseEmailAddress } from "@/lib/email/config";
import { consumeRateLimit, getClientIp, secondsFromMs } from "@/lib/contact/rateLimit";
import { contactDetailsSchema, validateContactAttachments } from "@/lib/contact/validation";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);

    const ipLimit = consumeRateLimit(`contact:submit:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!ipLimit.allowed) {
      return apiResponse({
        success: false,
        message: `Too many contact submissions. Try again in ${secondsFromMs(ipLimit.retryAfterMs)} seconds.`,
        status: 429,
      });
    }

    const formData = await request.formData();

    const first_name = (formData.get("first_name") || "").toString().trim();
    const last_name = (formData.get("last_name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim().toLowerCase();
    const phoneNumber = (formData.get("phoneNumber") || "").toString().trim();
    const subject = (formData.get("subject") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();
    const verificationToken = (formData.get("verificationToken") || "").toString().trim();

    const parsed = contactDetailsSchema.safeParse({
      first_name,
      last_name,
      email,
      phoneNumber,
      subject,
      message,
      verificationToken,
    });

    if (!parsed.success) {
      return apiResponse({
        success: false,
        message: "Please check your input fields and try again.",
        error: parsed.error.format(),
        status: 400,
      });
    }

    const emailLimit = consumeRateLimit(`contact:submit:email:${email}`, 3, 60 * 60 * 1000);
    if (!emailLimit.allowed) {
      return apiResponse({
        success: false,
        message: `This email has reached the submission limit. Try again in ${secondsFromMs(emailLimit.retryAfterMs)} seconds.`,
        status: 429,
      });
    }

    const verificationRecord = await db.verificationToken.findFirst({
      where: {
        identifier: `contact_verified_${email}`,
        token: verificationToken,
      },
    });

    if (!verificationRecord) {
      return apiResponse({
        success: false,
        message: "Email verification is required before submitting.",
        status: 400,
      });
    }

    if (verificationRecord.expires < new Date()) {
      await db.verificationToken.deleteMany({
        where: {
          identifier: `contact_verified_${email}`,
          token: verificationToken,
        },
      });

      return apiResponse({
        success: false,
        message: "Email verification expired. Please verify your email again.",
        status: 400,
      });
    }

    const rawAttachments = formData.getAll("attachments");
    const files = rawAttachments.filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const attachmentError = validateContactAttachments(files);
    if (attachmentError) {
      return apiResponse({
        success: false,
        message: attachmentError,
        status: 400,
      });
    }

    await db.verificationToken.deleteMany({
      where: {
        identifier: `contact_verified_${email}`,
        token: verificationToken,
      },
    });

    const toAddress =
      parseEmailAddress(process.env.CONTACT_RECEIVER_EMAIL) ||
      parseEmailAddress(process.env.EMAIL_REPLY_TO) ||
      parseEmailAddress(process.env.EMAIL_FROM);

    if (!toAddress) {
      return apiResponse({
        success: false,
        message: "Contact receiver email is not configured.",
        status: 500,
      });
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return {
          filename: file.name,
          content: buffer,
          contentType: file.type || "application/octet-stream",
        };
      })
    );

    const safeMessage = escapeHtml(message);
    const senderName = `${first_name} ${last_name}`;

    const emailService = createEmailService();

    await emailService.send({
      to: toAddress,
      subject,
      replyTo: { email, name: senderName },
      text: `${message}\n\nFrom: ${senderName}\nEmail: ${email}\nPhone: ${phoneNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <div style="white-space: pre-wrap;">${safeMessage}</div>
          <br />
          <p><strong>From:</strong> ${escapeHtml(senderName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phoneNumber)}</p>
        </div>
      `,
      attachments,
    });

    return apiResponse({
      success: true,
      message: "Your message has been sent successfully.",
      status: 200,
    });
  } catch (error) {
    console.error("[Public Contact Submit] Error:", error);
    return apiResponse({
      success: false,
      message: "Failed to submit contact form. Please try again.",
      error: error instanceof Error ? error.message : "Internal server error",
      status: 500,
    });
  }
}
