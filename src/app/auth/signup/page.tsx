"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from 'react-hot-toast';
import CustomToast from "@/components/CustomToast";
import Logo from "@/components/Logo";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";
import { OAuthButtons } from "@/components/OAuthButtons";
import { AuthFooter } from "@/components/AuthFooter";
import AuthContainer from '@/components/AuthContainer';

export default function SignupPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  }>({});
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
    setFieldErrors({});

    // Client-side validation for password confirmation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Passwords do not match"] });
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
        // Handle field-specific validation errors
        if (result.error && typeof result.error === 'object' && result.error !== null) {
          const errors: typeof fieldErrors = {};
          
          // Extract field-specific errors
          if (result.error.name?._errors) {
            errors.name = result.error.name._errors;
          }
          if (result.error.email?._errors) {
            errors.email = result.error.email._errors;
          }
          if (result.error.password?._errors) {
            errors.password = result.error.password._errors;
          }
          
          setFieldErrors(errors);
          
          // No need for general error toast since errors are displayed inline
        } else {
          // Handle other types of errors (like duplicate email)
          toast.custom((t) => (
            <CustomToast
              t={t}
              message={result.message || "Failed to create account"}
            />
          ));
        }
        return;
      }

      // Success - show toast and sign in
      toast.custom((t) => (
        <CustomToast
          t={t}
          message="Account created successfully! Signing you in..."
        />
      ));

      // After successful signup
      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/admin/onboard",
        redirect: false,
      });

      if (signInResult?.error) {
        toast.custom((t) => (
          <CustomToast
            t={t}
            message="Account created but failed to sign in. Please try logging in manually."
          />
        ));
        router.push("/auth/login");
      } else {
        // Let the redirect happen via useEffect
        router.push("/admin/onboard");
      }
    } catch (err) {
      toast.custom((t) => (
        <CustomToast
          t={t}
          message="An unexpected error occurred. Please try again."
        />
      ));
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
      {/*<Toaster position="top-center" />*/}
      <AuthContainer>
        <Logo />
        <AuthHeading
          title="Create your account"
          subtitle="Register to manage your organization's elections."
        />
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
            error={fieldErrors.name?.[0]}
          />
          
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            error={fieldErrors.email?.[0]}
          />
          
          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.password?.[0]}
          />
          
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword?.[0]}
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
