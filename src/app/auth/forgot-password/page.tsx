"use client";

import Image from "next/image";
import ForgotPasswordImage from "@/app/assets/ForgotPassword.png";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Heading */}
        <div>
          <p className="text-2xl font-semibold text-[var(--color-black)]">
            Forgot Password
          </p>
          <p className="text-sm text-[var(--color-gray)]">
            Enter your email account to reset password.
          </p>
        </div>

        {/* Image */}
        <div className="flex justify-center">
          <Image
            src={ForgotPasswordImage}
            alt="Forgot Password"
            className="w-[294.98px] h-[297px]"
          />
        </div>

        {/* Form */}
        <form className="space-y-4 text-left flex flex-col items-center">
          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Send OTP Button */}
          <button
            type="submit"
            className="w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold"
          >
            Send OTP
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            className="w-[380px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}
