"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "next/image";
import toast from "react-hot-toast";

import EnterOTP from "@/app/assets/EnterOTP.png";
import OtpInput from "@/components/OtpInput";

const OTPMFA = () => {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);

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

          // Check if otp-email is actually required
          if (!result.requiredMethods.includes('otp-email')) {
            toast.error("OTP verification is not required for this session.");
            router.push("/voter/login");
            return;
          }

          // Check if already completed
          if (result.completedMethods.includes('otp-email')) {
            toast.success("OTP verification already completed.");
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
          if (currentMethod !== 'otp-email') {
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
      case 'email-confirmation':
        router.push("/voter/login/mfa-email");
        break;
      case 'passphrase-email':
        router.push("/voter/login/mfa-passphrase");
        break;
      case 'otp-email':
        // Already on correct page
        break;
      default:
        console.error("Unknown MFA method:", method);
        router.push("/voter/election-status");
    }
  };

  const navigateToNextMethod = (method: string) => {
    switch (method) {
      case 'email-confirmation':
        router.push("/voter/login/mfa-email");
        break;
      case 'passphrase-email':
        router.push("/voter/login/mfa-passphrase");
        break;
      default:
        console.error("Unknown MFA method:", method);
        router.push("/voter/election-status");
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
  };

  const requestOtp = async () => {
    if (!sessionToken) {
      toast.error("No session token. Please login again.");
      router.push("/voter/login");
      return;
    }

    setIsRequestingOtp(true);

    try {
      const response = await fetch('/api/mfa/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionToken
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "OTP sent to your email address!");
        setOtpRequested(true);
      } else {
        toast.error(result.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    if (!sessionToken) {
      toast.error("No session token. Please login again.");
      router.push("/voter/login");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/mfa/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionToken,
          otp: otp
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || "Invalid OTP. Please try again.");
        setIsLoading(false);
        return;
      }

      // OTP verification successful - server has marked step as completed
      toast.success(result.message || "OTP verified successfully!");

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
      console.error("Error verifying OTP:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear MFA flow and return to login
    localStorage.removeItem("mfaFlow");
    localStorage.removeItem("voterData");
    router.push("/voter/login");
  };

  if (!sessionData || !sessionToken) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter OTP</p>
        <p className="voterlogin-subheading">
          Enter your One Time Password (OTP) to continue. Check your{" "}
          <span className="text-primary">email</span> app for the One Time
          Password (OTP) which will be serve as your credentials for this
          session.
        </p>
        <div className="mt-4 text-sm text-gray-600">
          Step {sessionData.currentStep + 1} of {sessionData.totalSteps}
        </div>
      </div>

      <Image src={EnterOTP} height={300} alt="Enter OTP" />
      
      {!otpRequested ? (
        <div className="flex flex-col gap-4 w-4/5 xs:w-auto items-center">
          <p className="voterlogin-label">
            Click the button below to request an OTP to be sent to your registered email address.
          </p>
          <Button
            variant="long_primary"
            onClick={requestOtp}
            disabled={isRequestingOtp}
          >
            {isRequestingOtp ? "Sending OTP..." : "Request OTP"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="voterlogin-label">One Time Password</p>
            <OtpInput length={6} onChange={handleOtpChange} />
          </div>

          <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
            <Button
              variant="long_primary"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Submit"}
            </Button>
            <Button
              variant="long_secondary"
              onClick={requestOtp}
              disabled={isRequestingOtp}
            >
              {isRequestingOtp ? "Sending..." : "Resend OTP"}
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button 
          variant="long_secondary" 
          onClick={handleCancel}
          disabled={isLoading || isRequestingOtp}
        >
          Cancel
        </Button>
      </div>
    </main>
  );
};

export default OTPMFA;
