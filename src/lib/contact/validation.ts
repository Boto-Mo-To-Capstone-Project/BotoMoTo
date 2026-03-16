import { z } from "zod";

export const CONTACT_ATTACHMENTS_MAX_FILES = 3;
export const CONTACT_ATTACHMENTS_MAX_TOTAL_SIZE = 9 * 1024 * 1024; // 9MB
export const CONTACT_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const CONTACT_VERIFIED_TTL_MS = 20 * 60 * 1000; // 20 minutes
export const CONTACT_OTP_MAX_ATTEMPTS = 5;

export const emailSchema = z.string().trim().toLowerCase().email("Invalid email address");

// Philippine mobile format with +63 prefix and 10 digits, starts with 9
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+639\d{9}$/, "Phone number must be in +63 format (e.g., +639123456789)");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name is too long")
  .regex(/^[a-zA-Z\s'.-]+$/, "Name contains invalid characters");

export const contactDetailsSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phoneNumber: phoneSchema,
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(120, "Subject is too long"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(4000, "Message is too long"),
  verificationToken: z.string().trim().min(20, "Invalid verification token"),
});

export const sendOtpSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export function validateContactAttachments(files: File[]) {
  if (files.length > CONTACT_ATTACHMENTS_MAX_FILES) {
    return `You can upload up to ${CONTACT_ATTACHMENTS_MAX_FILES} files only.`;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > CONTACT_ATTACHMENTS_MAX_TOTAL_SIZE) {
    return "Total attachment size must be under 9MB.";
  }

  for (const file of files) {
    if (file.size <= 0) {
      return `Attachment \"${file.name}\" is empty.`;
    }
  }

  return null;
}
