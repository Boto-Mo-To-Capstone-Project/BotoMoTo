"use client";

import Button from "@/components/Button";
import termsAndConditionList from "@/app/assets/termsAndConditionList";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/SubmitButton";

const ElectionTermsCondition = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [voterData, setVoterData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

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
    );
  }

  if (!voterData) {
    return null;
  }

  return (
    <main className="flex flex-col items-center px-5 pb-20 pt-30 text-justify w-full">
      <div className="w-full flex flex-col max-w-6xl mx-auto">
        {/* Header and subheading - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-8 py-8">
            <div className="flex flex-col items-start">
              <h2 className="text-md font-bold text-white mb-3">Terms and Conditions</h2>
              <p className="text-white text-sm font-medium opacity-90">
                {voterData.name}, you&apos;re voting in the {voterData?.election?.name || '2025 Election of Provident'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-[#7b1c1c]/20 p-8">
          <div className="flex items-center border-b border-[#7b1c1c]/10 pb-3 mb-4">
            <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
            <p className="text-sm font-semibold text-gray-900">Last updated: May 21, 2025</p>
          </div>
          
          <div className="space-y-4 text-sm text-gray-600">
            <p>Welcome to the Boto Mo 'To – a secure, digital platform for conducting official elections and surveys.</p>
            <p>By accessing and participating in any election on this platform, you agree to the following terms and conditions:</p>
          </div>

          {/* List of terms loop*/}
          <div className="space-y-6 mt-6">
            {termsAndConditionList.map((term, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-[#7b1c1c]/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-[#7b1c1c] rounded"></div>
                  <h3 className="text-sm font-semibold text-gray-900">{term.title}</h3>
                </div>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                  {term.descriptions.map((desc, descIndex) => (
                    <li key={descIndex}>{desc}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#7b1c1c]/5 rounded-lg border border-[#7b1c1c]/10">
            <p className="text-sm text-gray-600 mb-2">
              By using this system, you acknowledge that you have read,
              understood, and agreed to these Terms and Conditions.
            </p>
            <p className="text-sm text-gray-600">
              If you do not agree, please do not proceed with the voting process.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-6 p-4 bg-gray-50 rounded-lg border border-[#7b1c1c]/10">
            <input
              type="checkbox"
              id="terms-agreement"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-[#7b1c1c] focus:ring-[#7b1c1c]"
            />
            <label
              htmlFor="terms-agreement"
              className="text-sm font-medium text-gray-700"
            >
              I have read and agree to the Terms and Conditions
            </label>
          </div>

        </div>
        
        <div className="mt-6 flex justify-end gap-4 w-full max-w-6xl">
          <Button
            variant="secondary"
            onClick={handleLogout}
          >
            Logout
          </Button>
          <Button
            variant="primary"
            disabled={!isChecked}
            onClick={handleStartVoting}
          >
            Start Voting
          </Button>
        </div>
      </div>
    </main>
  );
};

export default ElectionTermsCondition;
