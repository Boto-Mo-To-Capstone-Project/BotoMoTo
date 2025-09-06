"use client"; // useRouter needs a client component

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Image from "next/image";

import EnterVoterCode from "@/app/assets/EnterVoterCode.png";
import OtpInput from "@/components/OtpInput";
import toast, { Toaster } from "react-hot-toast";

const VoterLoginPage = () => {
  const router = useRouter(); // to go to another route
  const [voterCode, setVoterCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOtpChange = (value: string) => {
    setVoterCode(value);
  };

  const handleSubmit = async () => {
    if (voterCode.length !== 6) {
      const msg = "Please enter a complete 6-digit code";
      toast.error(msg); // 👈 show in toast
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/voters/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voterCode })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Voter code verified successfully!"); // 👈 show in toast
        
        // Store voter, election, and ballot information in localStorage
        localStorage.setItem("voterData", JSON.stringify({
          voter: data.data.voter,
          election: data.data.election,
          ballotData: data.data.ballotData
        }));

        // Check if MFA is enabled and has methods
        const mfaSettings = data.data.election.mfaSettings;
        if (mfaSettings?.mfaEnabled && mfaSettings.mfaMethods?.length > 0) {
          // Store MFA state in localStorage for the MFA flow
          localStorage.setItem("mfaFlow", JSON.stringify({
            requiredMethods: mfaSettings.mfaMethods,
            completedMethods: [],
            currentStep: 0,
            voterCode: voterCode,
            electionId: data.data.election.id
          }));

          // Redirect to the first MFA method
          const firstMethod = mfaSettings.mfaMethods[0];
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
        const errorMessage = data.message || "Failed to verify voter code";
        toast.error(errorMessage); // 👈 show in toast
      }

    } catch (err: any) {
      toast.error("An error occurred. Please try again."); // 👈 show in toast
      console.error("Error verifying voter code:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className=" flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
      {/*<Toaster position="top-center" />*/} 
      <div className="text-center space-y-2">
        <p className="voterlogin-heading">Enter Voter Code</p>
        <p className="voterlogin-subheading">
          Enter your Voter Unique Code to continue. Check your{" "}
          <span className="text-primary">email</span> app to find your unique
          code.
        </p>
      </div>

      <Image src={EnterVoterCode} height={300} alt="BotoMoToLogo" />
      <div className="flex flex-col gap-2">
        <p className="voterlogin-label">Enter Unique Code</p>
        <OtpInput length={6} onChange={handleOtpChange} />
        {/* {error && <p className="text-red-500 text-sm mt-1">{error}</p>} */}
      </div>

      <div className="flex flex-col gap-4 w-4/5 xs:w-auto">
        <Button
          variant="long_primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Submit"}
        </Button>
        <Button variant="long_secondary">Cancel</Button>
      </div>
    </main>
  );
};

export default VoterLoginPage;
