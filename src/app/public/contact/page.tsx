"use client";

import AboutFooter from "@/components/about-us/AboutFooter";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s'.-]+$/;
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 9 * 1024 * 1024;

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const phoneNumber = `+63${phoneLocal}`;

  const fileTotalSize = useMemo(
    () => attachments.reduce((sum, file) => sum + file.size, 0),
    [attachments]
  );

  const attachmentError = useMemo(() => {
    if (attachments.length > MAX_FILES) return `You can upload up to ${MAX_FILES} files.`;
    if (fileTotalSize > MAX_TOTAL_BYTES) return "Total attachment size must be under 9MB.";
    return "";
  }, [attachments, fileTotalSize]);

  const fieldErrors = useMemo(() => {
    return {
      firstName:
        firstName.trim().length > 0 && (firstName.trim().length < 2 || !NAME_REGEX.test(firstName.trim()))
          ? "Enter a valid first name"
          : "",
      lastName:
        lastName.trim().length > 0 && (lastName.trim().length < 2 || !NAME_REGEX.test(lastName.trim()))
          ? "Enter a valid last name"
          : "",
      email:
        normalizedEmail.length > 0 && !EMAIL_REGEX.test(normalizedEmail)
          ? "Please enter a valid email"
          : "",
      phone:
        phoneLocal.length > 0 && !/^9\d{9}$/.test(phoneLocal)
          ? "Use a valid PH mobile number (9XXXXXXXXX)"
          : "",
      subject:
        subject.trim().length > 0 && subject.trim().length < 3
          ? "Subject must be at least 3 characters"
          : "",
      message:
        message.trim().length > 0 && message.trim().length < 10
          ? "Message must be at least 10 characters"
          : "",
    };
  }, [firstName, lastName, normalizedEmail, phoneLocal, subject, message]);

  const canSendOtp = EMAIL_REGEX.test(normalizedEmail) && otpCooldown <= 0 && !isSendingOtp && !otpVerified;

  const canOpenConfirm =
    firstName.trim().length >= 2 &&
    NAME_REGEX.test(firstName.trim()) &&
    lastName.trim().length >= 2 &&
    NAME_REGEX.test(lastName.trim()) &&
    EMAIL_REGEX.test(normalizedEmail) &&
    /^9\d{9}$/.test(phoneLocal) &&
    subject.trim().length >= 3 &&
    message.trim().length >= 10 &&
    !attachmentError &&
    privacyAccepted &&
    otpVerified &&
    verificationToken.length > 0;

  useEffect(() => {
    if (otpCooldown <= 0) return;

    const intervalId = window.setInterval(() => {
      setOtpCooldown((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [otpCooldown]);

  useEffect(() => {
    if (!isConfirmOpen) return;

    setConfirmCountdown(5);
    const intervalId = window.setInterval(() => {
      setConfirmCountdown((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isConfirmOpen]);

  const resetOtpVerification = () => {
    setOtpSent(false);
    setOtpVerified(false);
    setVerificationToken("");
    setOtp("");
  };

  const onEmailChange = (value: string) => {
    const next = value;
    if (next.trim().toLowerCase() !== normalizedEmail) {
      resetOtpVerification();
    }
    setEmail(next);
  };

  const onPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhoneLocal(digits);
  };

  const onFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    setAttachments(selected);
  };

  const sendOtp = async () => {
    if (!canSendOtp) return;

    setError("");
    setIsSendingOtp(true);

    try {
      const response = await fetch("/api/public/contact/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.message || "Failed to send OTP.");
        return;
      }

      setOtpSent(true);
      setOtpCooldown(60);
      toast.success("OTP sent. Check your inbox.");
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpSent || otp.length !== 6 || isVerifyingOtp || otpVerified) return;

    setError("");
    setIsVerifyingOtp(true);

    try {
      const response = await fetch("/api/public/contact/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        const message = payload.message || "OTP verification failed.";
        setError(message);
        if (message.includes("Incorrect OTP") || message.includes("OTP has expired")) {
          toast.error(message);
        }
        return;
      }

      setOtpVerified(true);
      setVerificationToken(payload.data?.verificationToken || "");
      toast.success("Email verified.");
    } catch {
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const submitContact = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("first_name", firstName.trim());
      data.append("last_name", lastName.trim());
      data.append("email", normalizedEmail);
      data.append("phoneNumber", phoneNumber);
      data.append("subject", subject.trim());
      data.append("message", message.trim());
      data.append("privacyAccepted", String(privacyAccepted));
      data.append("verificationToken", verificationToken);

      attachments.forEach((file) => {
        data.append("attachments", file);
      });

      const response = await fetch("/api/public/contact/submit", {
        method: "POST",
        body: data,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.message || "Failed to submit contact form.");
        return;
      }

      toast.success("Message sent successfully.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhoneLocal("");
      setSubject("");
      setMessage("");
      setAttachments([]);
      setPrivacyAccepted(false);
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
      setVerificationToken("");
      setOtpCooldown(0);
    } catch {
      setError("Failed to submit contact form. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center pt-20">
      <div className="flex flex-col items-center pt-20 pb-10 gap-4 px-5 xs:px-20 text-center">
        <p className="text-dmd font-semibold">Get in touch</p>
        <p className="text-xl font-normal text-gray text-center">Our team would love to hear from you.</p>
      </div>

      <div className="flex flex-col w-full xs:w-[420px] mb-10 px-5 items-center">
        <div className="flex justify-between w-full gap-2">
          <InputField
            placeholder="First name"
            label="First name"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={fieldErrors.firstName}
          />
          <InputField
            placeholder="Last name"
            label="Last name"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={fieldErrors.lastName}
          />
        </div>

        <InputField
          placeholder="you@gmail.com"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          error={fieldErrors.email}
          wrapperClassName="mt-4"
        />

        <div className="mt-3 w-full flex gap-2">
          <button
            type="button"
            onClick={sendOtp}
            disabled={!canSendOtp}
            className={`w-full h-[44px] rounded-[8px] text-sm font-semibold border-2 transition-colors ${
              !canSendOtp
                ? "border-gray-300 text-gray-400 cursor-not-allowed bg-white"
                : "border-primary text-primary bg-white hover:bg-primary hover:text-white"
            }`}
          >
            {otpVerified
              ? "Email Verified"
              : otpCooldown > 0
              ? `Resend in ${otpCooldown}s`
              : isSendingOtp
              ? "Sending..."
              : "Send OTP"}
          </button>
        </div>

        {otpSent && (
          <div className="w-full mt-3 flex gap-2 items-end">
            <InputField
              placeholder="6-digit code"
              label="OTP"
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              wrapperClassName="!mt-0"
            />
            <button
              type="button"
              onClick={verifyOtp}
              disabled={otpVerified || isVerifyingOtp || otp.length !== 6}
              className={`w-[130px] h-[44px] rounded-[8px] text-sm font-semibold transition-colors ${
                otpVerified
                  ? "bg-green-600 text-white cursor-not-allowed"
                  : "bg-[var(--color-primary)] hover:brightness-90 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              }`}
            >
              {otpVerified ? "Verified" : isVerifyingOtp ? "Verifying..." : "Verify"}
            </button>
          </div>
        )}

        <div className="mt-4 w-full">
          <label className="block text-sm font-medium text-[var(--color-black)] mb-1">Phone number</label>
          <div className="flex items-center h-[44px] border rounded-md overflow-hidden border-[var(--color-secondary)]">
            <span className="px-3 text-sm bg-gray-100 h-full flex items-center border-r border-[var(--color-secondary)]">+63</span>
            <input
              type="tel"
              value={phoneLocal}
              onChange={(event) => onPhoneChange(event.target.value)}
              className="w-full h-full px-3 text-sm focus:outline-none"
              placeholder="9XXXXXXXXX"
            />
          </div>
          {fieldErrors.phone ? <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p> : null}
        </div>

        <InputField
          placeholder="Subject"
          label="Subject"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          wrapperClassName="mt-4"
          error={fieldErrors.subject}
        />

        <InputField
          label="Message"
          textarea
          rows={5}
          placeholder="Type your message here..."
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          wrapperClassName="mt-4"
          error={fieldErrors.message}
        />

        <div className="mt-4 w-full">
          <label className="block text-sm font-medium text-[var(--color-black)] mb-2">Attachments (optional)</label>
          <div className="w-full flex items-center gap-2">
            <label className="flex-1 h-[48px] border-2 border-yellow-400 bg-yellow-50 rounded-md px-4 flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors">
              <span className="text-sm text-yellow-900 font-medium">Choose files</span>
              <span className="text-xs text-yellow-800">Max 3 files</span>
              <input type="file" multiple onChange={onFilesChange} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setAttachments([])}
              disabled={attachments.length === 0}
              title="Remove all attachments"
              className={`h-[48px] w-[48px] rounded-md flex items-center justify-center transition-colors ${
                attachments.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:brightness-90"
              }`}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Total attachment size must be under 9MB.</p>
          {attachments.length > 0 ? (
            <ul className="mt-2 text-xs text-gray-700">
              {attachments.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
          {attachmentError ? <p className="text-xs text-red-600 mt-1">{attachmentError}</p> : null}
        </div>

        <label className="w-full mt-4 flex items-center gap-2 text-sm text-[var(--color-black)]">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
          />
          I agree to the Privacy Policy
        </label>

        {error ? <p className="w-full mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!privacyAccepted || isSubmitting}
          className={`mt-5 w-full max-w-[380px] h-[44px] rounded-[8px] text-sm font-semibold transition-colors ${
            !privacyAccepted || isSubmitting
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-[var(--color-primary)] hover:brightness-90 text-white"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>

        {!canOpenConfirm ? (
          <p className="w-full mt-2 text-xs text-gray-500">
            Complete all fields, verify your email with OTP, and accept the privacy policy to continue.
          </p>
        ) : null}
      </div>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsConfirmOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-sm w-[92%] max-w-md p-5">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">Confirm Submission</h2>
            <p className="mt-2 text-sm text-gray-600">
              You can confirm submission after the safety countdown finishes.
            </p>

            <div className="mt-5 flex gap-3 justify-end">
              <SubmitButton
                type="button"
                variant="action"
                label="Cancel"
                onClick={() => setIsConfirmOpen(false)}
              />
              <button
                type="button"
                disabled={confirmCountdown > 0 || isSubmitting || !canOpenConfirm}
                onClick={submitContact}
                className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${
                  confirmCountdown > 0 || isSubmitting || !canOpenConfirm
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[var(--color-primary)] hover:brightness-90"
                }`}
              >
                {isSubmitting
                  ? "Submitting..."
                  : confirmCountdown > 0
                  ? `Confirm in ${confirmCountdown}s`
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AboutFooter />
    </main>
  );
}
