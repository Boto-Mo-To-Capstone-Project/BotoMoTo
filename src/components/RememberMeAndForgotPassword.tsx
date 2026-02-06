"use client";

import Link from "next/link";

export function RememberMeAndForgotPassword() {
  return (
    <div className="w-full max-w-[380px] flex items-center justify-between text-sm py-2">
      
      <Link href="/auth/forgot-password" className="text-[var(--color-primary)] hover:underline font-medium whitespace-nowrap">
        Forgot password?
      </Link>
    </div>
  );
}
