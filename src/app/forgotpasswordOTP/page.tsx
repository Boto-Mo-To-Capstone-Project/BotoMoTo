"use client";

import Image from "next/image";
import ForgotPasswordImage from "@/app/assets/ForgotPasswordOtp.png";

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
            Enter your One Time Password (OTP) sent to your email to continue
            changing your password.
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
        <form className="space-y-4 text-left">
          {/* OTP Inputs */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              One Time Password
            </label>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4].map((box) => (
                <input
                  key={box}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center border border-[var(--color-secondary)] text-[var(--color-secondary)] font-bold rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
                />
              ))}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[var(--color-primary)] hover:brightness-90 text-white py-2 rounded-md text-sm font-semibold"
          >
            Change Password
          </button>
        </form>
      </div>
    </main>
  );
}
