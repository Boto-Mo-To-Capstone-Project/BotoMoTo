"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Logo from "@/components/Logo";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";
import { OAuthButtons } from "@/components/OAuthButtons";
import { AuthFooter } from "@/components/AuthFooter";
import { ErrorMessage } from "@/components/ErrorMessage";
import { RememberMeAndForgotPassword } from "@/components/RememberMeAndForgotPassword";
import AuthContainer from '@/components/AuthContainer';
import { ROLES } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if user already has session with role-based logic
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const userRole = session.user.role;
      
      // Role-based redirect logic
      if (userRole === ROLES.SUPER_ADMIN) {
        // Superadmin goes directly to dashboard
        router.replace("/superadmin/dashboard");
      } else if (userRole === ROLES.ADMIN) {
        // Admin checks organization status for onboarding
        if (session.user.organization?.status === "APPROVED") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/admin/onboard");
        }
      } else {
        // Fallback for unknown roles
        router.replace("/auth/login");
      }
    }
  }, [sessionStatus, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting login", { email });
      const res = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin/onboard", // Default fallback
        redirect: false
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else if (res?.ok) {
        // Force a page reload to trigger session update and useEffect redirect
        // This ensures the session is properly updated before redirect logic runs
        window.location.reload();
      }
      
    } catch (err) {
      setError(`An unexpected error occurred. Please try again. ${err}`);
      console.error("Login error", err);
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
          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      </AuthContainer>
    </main>
  );
}
