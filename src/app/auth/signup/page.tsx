"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Logomark from "@/app/assets/Logomark.png";
import GoogleIcon from "@/app/assets/google-icon.png";
import FacebookIcon from "@/app/assets/facebook-icon.png";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Create user account
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
        }),
      });

      const signupResult = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupResult.error || "Failed to create account");
        return;
      }

      // Sign in the user
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(signInResult.error);
      } else {
        // Redirect to organization creation for new admin users
        router.push("/organization/create");
      }
    } catch (err) {
      setError(`An unexpected error occurred. Please try again. ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen flex justify-center px-4 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-md text-center space-y-6 pt-40">
        <div className="flex justify-center">
          <Image src={Logomark} alt="Boto Mo ‘To Logo" className="w-16 h-16" />
        </div>

        <div>
          <p className="text-2xl font-semibold text-[var(--color-black)]">
            Create your account
          </p>
          <p className="text-sm text-[var(--color-gray)]">
            Register to manage your organization&apos;s elections.
          </p>
        </div>

        {/* Form */}
        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-4 text-left flex flex-col items-center">
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
          disabled={isLoading}
          className={`w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold ${
            isLoading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? "Signing Up..." : "Sign Up"}
        </button>
        </form>

      {/* Divider Buttons (Centered & Side by Side) */}
      <div className="flex justify-center">
        <div className="w-[380px] flex justify-between">
          <button 
            onClick={() => signIn("google", { callbackUrl: "/organization/create" })} 
            className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            <Image src={GoogleIcon} alt="Google" className="w-5 h-5" />
            Google
          </button>

          <button 
            onClick={() => signIn("facebook", { callbackUrl: "/organization/create" })} 
            className="w-[187px] h-[44px] flex items-center justify-center border border-gray-300 rounded-md text-sm gap-2 hover:bg-gray-50"
          >
            <Image src={FacebookIcon} alt="Facebook" className="w-5 h-5" />
            Facebook
          </button>
        </div>
      </div>

        {/* Footer */}
        <p className="text-sm text-[var(--color-gray)]">
          Have an account?{" "}
          <a href="/auth/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Log In
          </a>
        </p>
      </div>
    </main>
  );
}
