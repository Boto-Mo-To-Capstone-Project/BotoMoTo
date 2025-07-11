"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ForgotPasswordImage from "@/app/assets/ForgotPasswordOtp.png";

import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import OtpInput from "@/components/OtpInput";

export default function ForgotPasswordOtpPage() {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // TODO: Implement password reset logic
      console.log("OTP:", otp.join(""));
      console.log("New password:", password);
      // For now, just simulate success
      router.push("/auth/login");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 pt-10 pb-10 px-4">
        
        <AuthHeading
          title="Forgot Password"
          subtitle="Enter your One Time Password (OTP) sent to your email to continue changing your password."
        />

        {error && <ErrorMessage message={error} />}

        {/* Image */}
        <div className="flex justify-center">
          <Image
            src={ForgotPasswordImage}
            alt="Forgot Password"
            className="w-[294.98px] h-[297px]"
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
              value={otp}
              onChange={(index, val) => {
                const newOtp = [...otp];
                newOtp[index] = val;
                setOtp(newOtp);
              }}
              length={4}
            />
          </div>

          {/* Password */}
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {/* Confirm Password */}
          <InputField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <SubmitButton label="Change Password" isLoading={isLoading} className="w-full" />
        </form>

        <AuthFooter
          question="Remember your password?"
          link="/auth/login"
          linkText="Log In"
        />
      </div>
    </main>
  );
}
