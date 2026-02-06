"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { field } from "@/lib/schema";
import ForgotPasswordImage from "@/app/assets/ForgotPasswordOtp.png";

import { AuthHeading } from "@/components/AuthHeading";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import OtpInput from "@/components/OtpInput";
import AuthContainer from '@/components/AuthContainer';

export default function ForgotPasswordOtpPage() {
  const [otpValue, setOtpValue] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();

  // Get email from sessionStorage on component mount
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("resetEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email in session, redirect back to forgot password page
      router.push("/auth/forgot-password");
      return;
    }
    setIsCheckingSession(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});

    // Client-side validation
    const errors: typeof fieldErrors = {};

    if (!otpValue || otpValue.length !== 6) {
      errors.otp = "Please enter a valid 6-digit OTP";
    }

    // Use schema validation for password
    try {
      const passwordSchema = field.password("Password");
      passwordSchema.parse(password);
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        errors.password = error.errors[0].message;
      } else {
        errors.password = "Password is required";
      }
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          otp: otpValue,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear the stored email
        sessionStorage.removeItem("resetEmail");

        toast.success("Password reset successfully! You can now log in with your new password.");
        
        // Delay redirect to allow toast to be seen
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
      } else {
        // Show server error as general error
        setFieldErrors({ general: data.message || "Failed to reset password. Please try again." });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setFieldErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("New OTP sent to your email address.");
        setOtpValue(""); // Clear current OTP input
      } else {
        setFieldErrors({ general: data.message || "Failed to resend OTP. Please try again." });
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      setFieldErrors({ general: "Failed to resend OTP. Please try again." });
    } finally {
      setIsResending(false);
    }
  };

  // Don't render if still checking session or email is not available
  if (isCheckingSession || !email) {
    return (
      <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] md:pt-40 md:pb-40">
      <AuthContainer>
        <AuthHeading
          title="Forgot Password"
          subtitle={`Enter the OTP sent to ${email} and your new password.`}
        />
        {fieldErrors.general && <ErrorMessage message={fieldErrors.general} />}
        {/* Image */}
        <div className="flex justify-center">
          <Image
            src={ForgotPasswordImage}
            alt="Forgot Password"
            className="w-[180px] h-[180px] md:w-[294.98px] md:h-[297px]"
          />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
          {/* OTP Input */}
          <div className="w-full max-w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              One Time Password
            </label>
            <OtpInput
              length={6}
              onChange={(value) => setOtpValue(value)}
            />
            {fieldErrors.otp && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.otp}</p>
            )}
          </div>

          {/* Password */}
          <PasswordField
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.password}
          />

          {/* Confirm Password */}
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />

          <SubmitButton label="Change Password" isLoading={isLoading} className="w-full" />
          
          {/* Resend OTP Button */}
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={isResending}
            className="w-full max-w-[380px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Resending..." : "Resend OTP"}
          </button>
        </form>

        <AuthFooter
          question="Remember your password?"
          link="/auth/login"
          linkText="Log In"
        />
      </AuthContainer>
    </main>
  );
}
