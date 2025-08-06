"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { OAuthButtons } from "@/components/OAuthButtons";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import AuthContainer from '@/components/AuthContainer';

export default function SignupPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if user already has session
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      if (session.user.organization?.status === "APPROVED") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/admin/onboard");
      }
    }
  }, [sessionStatus, session, router]);

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
      console.log("Sending signup request", { fullName, email, password });
      const res = await fetch("/api/auth/signup", {
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

      const result = await res.json();
      
      console.log("Signup API response", res.status, result);

      if (!res.ok) {
        setError(result.error || "Failed to create account");
        return;
      }

      // After successful signup
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin/onboard",
        redirect: false,
      });
      
      // Let the redirect happen via useEffect
      window.location.href = "/admin/onboard";
    } catch (err) {
      setError(`An unexpected error occurred. Please try again. ${err}`);
      console.error("Signup error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (sessionStatus === "loading") {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] md:pt-40 md:pb-40">
      <AuthContainer>
        <Logo />
        <AuthHeading
          title="Create your account"
          subtitle="Register to manage your organization's elections."
        />
        {error && <ErrorMessage message={error} />}
        <form
          onSubmit={handleSignup}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
          <InputField
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
          />
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <InputField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <SubmitButton label="Sign Up" isLoading={isLoading} className="w-full" />
        </form>
        <OAuthButtons />
        <AuthFooter
          question="Have an account?"
          link="/auth/login"
          linkText="Log In"
        />
      </AuthContainer>
    </main>
  );
}
