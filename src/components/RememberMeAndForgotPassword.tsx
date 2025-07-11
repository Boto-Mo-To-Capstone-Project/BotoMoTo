"use client";

import Link from "next/link";

export function RememberMeAndForgotPassword() {
  return (
    <div className="w-full max-w-[380px] flex items-center justify-between text-sm py-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="form-checkbox border-gray-300 rounded" />
        <span className="text-[var(--color-black)]">Remember for 30 days</span>
      </label>
      <Link href="/auth/forgot-password" className="text-[var(--color-primary)] hover:underline font-medium whitespace-nowrap">
        Forgot password?
      </Link>
    </div>
  );
}
