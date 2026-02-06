"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { field } from "@/lib/schema";
import ForgotPasswordImage from "@/app/assets/ForgotPassword.png";

import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import AuthContainer from '@/components/AuthContainer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFieldErrors({});

    // Email validation using schema
    try {
      const emailSchema = field.email("Email");
      emailSchema.parse(email.trim());
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        setFieldErrors({ email: error.errors[0].message });
      } else {
        setFieldErrors({ email: "Email is required" });
      }
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store email in sessionStorage for the OTP page
        sessionStorage.setItem("resetEmail", email.trim());

        toast.success("Password reset code sent to your email!");
        
        router.push("/auth/forgot-password/otp");
      } else {
        setFieldErrors({ general: data.message || "Failed to send reset code. Please try again." });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setFieldErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/auth/login");
  };

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] md:pt-40 md:pb-40">
      <AuthContainer>
        <AuthHeading
          title="Forgot Password"
          subtitle="Enter your email account to reset password."
        />
        {fieldErrors.general && <ErrorMessage message={fieldErrors.general} />}
        <div className="flex justify-center">
          <Image
            src={ForgotPasswordImage}
            alt="Forgot Password"
            className="w-[294.98px] h-[297px]"
          />
        </div>
        <form
          onSubmit={handleForgotPassword}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <SubmitButton label="Send OTP" isLoading={isLoading} className="w-full" />
          <button
            type="button"
            onClick={handleCancel}
            className="w-full max-w-[380px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            Cancel
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
