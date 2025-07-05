"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Logomark from "@/app/assets/Logomark.png";
import GoogleIcon from "@/app/assets/google-icon.png";
import FacebookIcon from "@/app/assets/facebook-icon.png";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const Router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    Router.push("/login"); // Redirect to login after successful signup

    // Optional: Auto-login after signup
    // await signIn("credentials", {
    //   email,
    //   password,
    //   callbackUrl: "/", // Redirect after login
    // });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Image src={Logomark} alt="Boto Mo ‘To Logo" className="w-16 h-16" />
        </div>

        <div>
          <p className="text-2xl font-semibold text-[var(--color-black)]">
            Create your account
          </p>
          <p className="text-sm text-[var(--color-gray)]">
            Register to manage your organization's elections.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4 text-left flex flex-col items-center">
          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <div className="w-[380px]">
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <button
            type="submit"
            className="w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold"
          >
            Sign Up
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

        {/* Footer */}
        <p className="text-sm text-[var(--color-gray)]">
          Have an account?{" "}
          <a href="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Log In
          </a>
        </p>
      </div>
    </main>
  );
}
