"use client";

import Button from "@/components/Button";

import termsAndConditionList from "@/app/assets/termsAndConditionList"; // example image for open state

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/SubmitButton";

const ElectionTermsCondition = () => {
  const [isChecked, setIsChecked] = useState(false); // so checkbutton must be clicked before proceeding
  const [voterData, setVoterData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter(); // to go to another route

  useEffect(() => {
    checkSession();
  }, []);

  // Get voter data from session (more secure than localStorage)
  const checkSession = async () => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVoterData(data.voter);
      } else {
        router.push("/voter/login");
        return;
      }
    } catch (e) {
      console.error("Error checking voter session:", e);
      router.push("/voter/login");
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/voter/logout", { method: "POST" });
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      // Clear localStorage and redirect
      localStorage.removeItem("voterData");
      localStorage.removeItem("mfaFlow");
      router.push("/voter/login");
    }
  };

  const handleStartVoting = () => {
    if (!isChecked) {
      toast.error("Please read and agree to the Terms and Conditions before proceeding.");
      return;
    }
    router.push("/voter/ballot-form");
  };
  if (isLoading) {
    return (
      <main className="flex flex-col items-center gap-10 px-5 pb-20 pt-40 text-justify animate-pulse w-full">
        {/* Header skeleton */}
        <div className="text-center space-y-2 w-full sm:w-3/4 md:w-1/2">
          <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto" />
        </div>

        {/* Content skeleton */}
        <div className="w-full sm:w-3/4 md:w-1/2 space-y-10">
          {/* Last updated */}
          <div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>

          {/* Terms list skeleton */}
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 bg-gray-300 rounded w-2/3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-11/12" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>

          {/* Agreement checkbox */}
          <div className="flex items-center gap-3 mt-10">
            <div className="h-6 w-6 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>

          {/* Buttons */}
          <div className="mt-10 space-y-5 w-full flex flex-col items-center">
            <div className="h-10 bg-gray-300 rounded w-full max-w-[250px]" />
            <div className="h-10 bg-gray-200 rounded w-full max-w-[250px]" />
          </div>
        </div>
      </main>
    )

  }
  if (!voterData) {
    return null; // Will redirect to login
  }

  return (
    <main className="flex flex-col items-center gap-10 px-5 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Terms and Conditions</p>
        <p className="voter-election-subheading">
          {voterData.name}, you&apos;re voting in the {voterData?.election?.name || '2025 Election of Provident'}
        </p>
      </div>
      <div className="max-w-[380px] sm:max-w-none sm:w-3/5">
        <div className="mb-10">
          <p className="voter-election-desc">
            <strong>Last updated: May 21, 2025</strong>
          </p>
          <li className="list-none voter-election-desc space-y-3 mt-2">
            <ul>
              Welcome to the Boto Mo ‘To – a secure, digital platform for
              conducting official elections and surveys.
            </ul>
            <ul>
              By accessing and participating in any election on this platform,
              you agree to the following terms and conditions:
            </ul>
          </li>
        </div>
        {/* List of terms loop*/}
        <div className="space-y-10">
          {termsAndConditionList.map((term, index) => (
            <div key={index} className="flex flex-col gap-2">
              <p className="voter-election-item">{term.title}</p>
              <ul className="list-disc pl-5 space-y-2 voter-election-desc">
                {term.descriptions.map((desc, descIndex) => (
                  <li key={descIndex}>{desc}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <li className="list-none voter-election-desc space-y-3 mt-2">
            <ul>
              By using this system, you acknowledge that you have read,
              understood, and agreed to these Terms and Conditions.
            </ul>
            <ul>
              If you do not agree, please do not proceed with the voting
              process.
            </ul>
          </li>
        </div>
        <div className="flex gap-3 items-center mt-10">
          <input
            type="checkbox"
            id="terms-agreement"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="h-6 w-6 accent-primary flex-shrink-0"
          />
          <label
            htmlFor="terms-agreement"
            className="text-sm font-semibold text-gray-600 sm:text-md"
          >
            I have read and agree to the Terms and Conditions
          </label>
        </div>
        <div className="mt-10 space-y-5 w-full flex flex-col items-center">
          <SubmitButton 
            label="Start Voting"
            onClick={handleStartVoting}
            isLoading={!isChecked}
          />
          <SubmitButton 
            label="Logout"
            onClick={handleLogout}
            variant="outline"
          />
        </div>
      </div>
    </main>
  );
};

export default ElectionTermsCondition;
