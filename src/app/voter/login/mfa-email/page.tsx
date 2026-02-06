"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "next/image";
import toast from "react-hot-toast";

import EnterEmail from "@/app/assets/EnterEmail.png";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

const EmailMFA = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    // Get session token from localStorage
    const mfaFlowData = localStorage.getItem("mfaFlow");
    
    if (!mfaFlowData) {
      toast.error("Invalid session. Please login again.");
      router.push("/voter/login");
      return;
    }

    try {
      const parsedMfaFlow = JSON.parse(mfaFlowData);
      const token = parsedMfaFlow.sessionToken;
      
      if (!token) {
        toast.error("No session token found. Please login again.");
        router.push("/voter/login");
        return;
      }

      setSessionToken(token);

      // Fetch current session state from server
      const fetchSessionData = async () => {
        try {
          const response = await fetch(`/api/mfa/session?sessionToken=${token}`);
          const result = await response.json();

          if (!response.ok || result.error) {
            toast.error(result.error || "Session expired. Please login again.");
            localStorage.removeItem("mfaFlow");
            router.push("/voter/login");
            return;
          }

          setSessionData(result);

          // Check if email-confirmation is actually required
          if (!result.requiredMethods.includes('email-confirmation')) {
            toast.error("Email confirmation is not required for this session.");
            router.push("/voter/login");
            return;
          }

          // Check if already completed
          if (result.completedMethods.includes('email-confirmation')) {
            toast.success("Email confirmation already completed.");
            // Navigate to next step or complete
            if (result.isCompleted) {
              router.push("/voter/election-status");
            } else {
              const nextMethod = result.requiredMethods[result.currentStep];
              navigateToNextMethod(nextMethod);
            }
            return;
          }

          // Check if this is the current step
          const currentMethod = result.requiredMethods[result.currentStep];
          if (currentMethod !== 'email-confirmation') {
            toast.error(`You must complete ${currentMethod} first.`);
            navigateToMethod(currentMethod);
            return;
          }

        } catch (error) {
          console.error("Error fetching session data:", error);
          toast.error("Failed to load session. Please login again.");
          router.push("/voter/login");
        }
      };

      fetchSessionData();

    } catch (error) {
      console.error("Error parsing MFA flow data:", error);
      toast.error("Invalid session data. Please login again.");
      router.push("/voter/login");
    }
  }, [router]);

  const navigateToMethod = (method: string) => {
    switch (method) {
      case 'otp-email':
        router.push("/voter/login/mfa-otp");
        break;
      case 'passphrase-email':
        router.push("/voter/login/mfa-passphrase");
        break;
      case 'email-confirmation':
        // Already on correct page
        break;
      default:
        console.error("Unknown MFA method:", method);
        router.push("/voter/election-status");
    }
  };

  const navigateToNextMethod = (method: string) => {
    switch (method) {
      case 'otp-email':
        router.push("/voter/login/mfa-otp");
        break;
      case 'passphrase-email':
        router.push("/voter/login/mfa-passphrase");
        break;
      default:
        console.error("Unknown MFA method:", method);
        router.push("/voter/election-status");
    }
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!sessionToken) {
      toast.error("No session token. Please login again.");
      router.push("/voter/login");
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API to verify email using session token
      const response = await fetch("/api/mfa/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken: sessionToken,
          email: email,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Email verification failed");
        setIsLoading(false);
        return;
      }

      // Email verification successful - server has marked step as completed
      toast.success(result.message || "Email confirmed successfully!");

      // Check if there are more MFA methods to complete
      if (!result.data.isCompleted) {
        const nextMethod = result.data.nextMethod;
        if (nextMethod) {
          toast.success("Proceeding to next authentication step.");
          navigateToNextMethod(nextMethod);
        } else {
          router.push("/voter/election-status");
        }
      } else {
        // All MFA methods completed
        toast.success("Authentication completed successfully!");
        localStorage.removeItem("mfaFlow"); // Clean up MFA flow data
        router.push("/voter/election-status");
      }

    } catch (err: any) {
      toast.error("An error occurred. Please try again.");
      console.error("Error in email confirmation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    // Clear MFA flow and logout from session
    try {
      await fetch("/api/voter/logout", { method: "POST" });
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      localStorage.removeItem("mfaFlow");
      router.push("/voter/login");
    }
  };

  if (!sessionData || !sessionToken) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 sm:px-20 pb-20 pt-40 animate-pulse">
        {/* Heading + Subheading */}
        <div className="text-center space-y-4 max-w-[380px] w-full">
          <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-full" />
            <div className="h-4 bg-gray-300 rounded w-5/6 mx-auto" />
            <div className="h-4 bg-gray-300 rounded w-4/6 mx-auto" />
          </div>
          <div className="h-3 bg-gray-300 rounded w-1/2 mx-auto mt-3" />
        </div>

        {/* Image placeholder */}
        <div className="w-[280px] h-[200px] sm:w-[320px] sm:h-[240px] bg-gray-300 rounded-xl" />

        {/* Input + Buttons area */}
        <div className="flex flex-col w-full max-w-[380px] gap-4">
          {/* Description / label */}
          <div className="h-4 bg-gray-300 rounded w-5/6 mx-auto mb-8" />

          {/* Input field */}
          <div className="h-10 bg-gray-300 rounded-md w-full" />

          {/* Buttons */}
          <div className="mt-5 space-y-3 w-full flex flex-col">
            <div className="h-10 bg-gray-300 rounded-md w-full" />
            <div className="h-10 bg-gray-300 rounded-md w-full" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-5 sm:px-20 pb-20 pt-40">
      <div className="text-center space-y-2 max-w-[380px] ">
        <p className="voterlogin-heading">Email Confirmation</p>
        <p className="voterlogin-subheading">
          Please confirm your email address to continue. Enter the email address 
          you used when registering for this election.
        </p>
        <div className="mt-4 text-sm text-gray-600">
          Step {sessionData.currentStep + 1} of {sessionData.totalSteps}
        </div>
      </div>

      <Image src={EnterEmail} height={300} alt="Email Confirmation" />
      
      <div className="flex flex-col gap-2 w-full max-w-[380px]">
        <InputField
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
        />
        <div className="flex flex-col gap-4 w-full mt-5">
          <SubmitButton
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            label="Confirm Email"
            />
          <SubmitButton 
            variant="action" 
            onClick={handleCancel}
            isLoading={isLoading}
            label="Cancel"
            />
        </div>
      </div>
    </main>
  );
};

export default EmailMFA;
