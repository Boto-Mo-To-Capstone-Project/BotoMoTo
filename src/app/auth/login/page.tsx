"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";

import Logo from "@/components/Logo";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { OAuthButtons } from "@/components/OAuthButtons";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import { RememberMeAndForgotPassword } from "@/components/RememberMeAndForgotPassword";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        const res = await fetch("/api/auth/session");
        const session = await res.json();

        if (session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") {
          router.push("/dashboard");
        } else {
          setError("You don't have permission to access this system");
          await signOut({ redirect: false });
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex justify-center items-center px-2 bg-[var(--background)] text-[var(--foreground)] pt-40 pb-40">
      <div className="w-full max-w-[380px] mx-auto text-center space-y-6 px-4">
        <Logo />
        <AuthHeading 
          title="Log in to your account"
          subtitle="Welcome back! Please enter your details." 
        />

        {error && <ErrorMessage message={error} />}

        <form
          onSubmit={handleLogin}
          className="space-y-4 text-left flex flex-col items-center w-full"
        >
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
            autoComplete="current-password"
          />

          <div className="w-full max-w-[380px]">
            <RememberMeAndForgotPassword />
          </div>

          <SubmitButton label="Login" isLoading={isLoading} className="w-full" />
        </form>

        <OAuthButtons />

        <AuthFooter
          question="Don't have an account?"
          link="/auth/signup"
          linkText="Sign Up"
        />
      </div>
    </main>
  );
}
