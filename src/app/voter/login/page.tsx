"use client"; // useRouter needs a client component

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "next/image";

import EnterVoterCode from "@/app/assets/EnterVoterCode.png";
import OtpInput from "@/components/OtpInput";
import toast, { Toaster } from "react-hot-toast";
import { SubmitButton } from "@/components/SubmitButton";

const VoterLoginPage = () => {
  const router = useRouter(); // to go to another route
  const [voterCode, setVoterCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check if voter is already logged in and redirect appropriately
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const response = await fetch('/api/voter/session', {
        method: 'GET',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        const voter = data.voter;
        
        console.log("Existing session found", { 
          voted: voter.voted, 
          mfaCompleted: voter.mfaCompleted,
          mfaEnabled: voter.election?.mfaSettings?.mfaEnabled 
        });

        // ✅ New condition
        const election = voter.election;
        if (election?.status === "ACTIVE") {
          const now = new Date();
          const startDate = new Date(election.startDate);

          if (now < startDate) {
            router.replace("/voter/election-status");
            return;
          }
        }

        // If voter has already voted, redirect to live dashboard
        if (voter.voted) {
          console.log("Voted user - redirecting to live dashboard");
          router.replace("/voter/live-dashboard");
          return;
        }
        
        // Check if MFA is required for this election
        const mfaRequired = voter.election?.mfaSettings?.mfaEnabled && 
                           voter.election.mfaSettings.mfaMethods?.length > 0;
        
        // If no MFA required OR MFA is completed, redirect to election status
        if (!mfaRequired || voter.mfaCompleted) {
          console.log("No MFA required or MFA completed - redirecting to election status");
          router.replace("/voter/election-status");
          return;
        }
        
        // MFA is required but not completed - check if there's an active MFA session
        const mfaFlowData = localStorage.getItem("mfaFlow");
        if (mfaFlowData) {
          try {
            const mfaFlow = JSON.parse(mfaFlowData);
            
            // Check if MFA session is still valid
            const mfaResponse = await fetch(`/api/mfa/session?sessionToken=${mfaFlow.sessionToken}`);
            if (mfaResponse.ok) {
              const mfaData = await mfaResponse.json();
              
              // Redirect to current MFA step
              if (!mfaData.isCompleted && mfaData.currentStep < mfaData.totalSteps) {
                const nextMethod = mfaData.requiredMethods[mfaData.currentStep];
                console.log(`Resuming MFA flow at step: ${nextMethod}`);
                
                switch (nextMethod) {
                  case 'email-confirmation':
                    router.replace("/voter/login/mfa-email");
                    return;
                  case 'otp-email':
                    router.replace("/voter/login/mfa-otp");
                    return;
                  case 'passphrase-email':
                    router.replace("/voter/login/mfa-passphrase");
                    return;
                  default:
                    console.error("Unknown MFA method:", nextMethod);
                    break;
                }
              }
            }
          } catch (error) {
            console.log("Invalid MFA flow data, will restart MFA");
            localStorage.removeItem("mfaFlow");
          }
        }
        
        // MFA required but no valid session - need to restart MFA flow
        console.log("MFA required but incomplete - user needs to complete MFA");
        // Don't redirect, let them restart the login process
        
      } else {
        // No existing session, user can proceed with login
        console.log("No existing session, allowing login page access");
      }
    } catch (error) {
      console.log("Error checking session:", error);
      // If session check fails, allow login page access
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setVoterCode(value);
  };

  const handleSubmit = async () => {
    if (voterCode.length !== 6) {
      const msg = "Please enter a complete 6-digit code";
      toast.error(msg);
      return;
    }

    setIsLoading(true);

    try {
      // Single API call that handles verification AND session creation
      const response = await fetch('/api/voter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voterCode })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Login successful!");

        // Check if MFA is enabled and has methods
        const mfaSettings = data.data.election.mfaSettings;
        if (mfaSettings?.mfaEnabled && mfaSettings.mfaMethods?.length > 0) {
          // Initialize secure MFA session on the server
          const mfaResponse = await fetch('/api/mfa/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              electionId: data.data.election.id,
              voterEmail: data.data.voter.email,
              voterCode: voterCode,
            })
          });

          const mfaData = await mfaResponse.json();

          if (!mfaResponse.ok || mfaData.error) {
            toast.error(mfaData.error || "Failed to initialize MFA session");
            return;
          }

          // Store ONLY the temporary MFA session token for MFA flow (removed voter data storage)
          localStorage.setItem("mfaFlow", JSON.stringify({
            sessionToken: mfaData.sessionToken,
            totalSteps: mfaData.totalSteps,
          }));

          // Redirect to the first MFA method
          const firstMethod = mfaData.requiredMethods[0];
          switch (firstMethod) {
            case 'email-confirmation':
              router.push("/voter/login/mfa-email");
              break;
            case 'otp-email':
              router.push("/voter/login/mfa-otp");
              break;
            case 'passphrase-email':
              router.push("/voter/login/mfa-passphrase");
              break;
            default:
              console.error("Unknown MFA method:", firstMethod);
              router.push("/voter/election-status");
          }
        } else {
          // No MFA required, go directly to election status
          router.push("/voter/election-status");
        }
      } else {
        // Handle various error types with appropriate messages
        let errorMessage = data.error || data.message || "Failed to login";
        
        if (response.status === 409) {
          errorMessage = "This voter code is already in use on another device.";
        } else if (response.status === 403) {
          // Election status or voter eligibility issues
          errorMessage = data.error;
        } else if (response.status === 404) {
          errorMessage = "Invalid voter code";
        }
        
        toast.error(errorMessage);
      }

    } catch (err: any) {
      toast.error("An error occurred. Please try again.");
      console.error("Error during login:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-5 pb-20 pt-40 flex justify-center">
      <div className="max-w-[380px] flex flex-col items-center gap-5 ">
        <div className="text-center space-y-2">
          <p className="voterlogin-heading">Enter Voter Code</p>
          <p className="voterlogin-subheading">
            Enter your Voter Unique Code to continue. Check your{" "}
            <span className="text-primary">email</span> app to find your unique
            code.
          </p>
        </div>

        <Image src={EnterVoterCode} height={250} alt="BotoMoToLogo" />

        <div className="w-full flex flex-col items-between gap-2">
          <p className="voterlogin-label">Enter Unique Code</p>
          <OtpInput length={6} onChange={handleOtpChange} />
        </div>
        <div className="w-full mt-5 space-y-5">
          <SubmitButton 
            label={`${isLoading ? "Verifying..." : "Submit"}`}
            onClick={handleSubmit}
            isLoading={isLoading}
          />
          <SubmitButton 
            label="Cancel"
            onClick={() => router.push("/")}
            variant="outline"
          />
        </div>
      </div>
    </main>
  );
};

export default VoterLoginPage;
