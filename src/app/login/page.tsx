"use client";

import Image from "next/image";
import Logomark from "@/app/assets/Logomark.png";
import GoogleIcon from "@/app/assets/google-icon.png";
import FacebookIcon from "@/app/assets/facebook-icon.png";


export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Image src={Logomark} alt="Boto Mo ‘To Logo" className="w-16 h-16" />
        </div>

        {/* Heading */}
        <div>
          <p className="text-2xl font-semibold text-[var(--color-black)]">
            Log in to your account
          </p>
          <p className="text-sm text-[var(--color-gray)]">
            Welcome back! Please enter your details.
          </p>
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
              className="w-[380px] h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-[380px] h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <div className="w-[380px] flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="form-checkbox border-gray-300 rounded"
              />
              <span className="text-[var(--color-black)]">
                Remember for 30 days
              </span>
            </label>
            <a
              href="#"
              className="text-[var(--color-primary)] hover:underline font-medium"
            >
              Forgot password
            </a>
          </div>

          <button
            type="submit"
            className="w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold"
          >
            Log In
          </button>
        </form>

      {/* Divider Buttons (Centered & Side by Side) */}
      <div className="flex justify-center">
        <div className="w-[380px] flex justify-between">
          <button className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50">
            <Image src={GoogleIcon} alt="Google" className="w-5 h-5" />
            Google
          </button>

          <button className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50">
            <Image src={FacebookIcon} alt="Facebook" className="w-5 h-5" />
            Facebook
          </button>
        </div>
      </div>


        {/* Sign up Footer */}
        <p className="text-sm text-[var(--color-gray)]">
          Don’t have an account?{" "}
          <a
            href="/signup" className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
