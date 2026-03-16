"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BallotComponent from "@/components/BallotComponent";
import UserHeader from "@/components/voter/UserHeader";

const BallotForm = () => {
  const router = useRouter();
  const [voterData, setVoterData] = useState<any>(null);
  const [ballotData, setBallotData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkSession();
  }, []);

  // Get voter data and ballot data from session (secure, session-based approach)
  const checkSession = async () => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setVoterData(data.voter);
        
        // Check if voter has already voted and redirect to live dashboard
        if (data.voter.voted) {
          console.log("Voter has already voted, redirecting to live dashboard");
          router.push("/voter/live-dashboard");
          return;
        }

        // Set ballot data from session API response
        setBallotData(data.voter.ballotData || { positions: [], parties: [] });
      } else {
        router.push("/voter/login");
        return;
      }
    } catch (e) {
      console.error("Error checking voter session:", e);
      router.push("/voter/login");
      return;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/voter/election-terms-conditions");
  };

  const handleReview = () => {
    router.push("/voter/ballot-form/review");
  };

  if (loading || !voterData) {
    return (
      <main className="flex flex-col items-center px-5 sm:px-20 pb-20 text-justify pt-30 animate-pulse">
        <div className="w-full flex flex-col">
          <UserHeader isLoading className="mb-4" />
          {/* Header */}
          <div className="mb-6 rounded-2xl bg-gray-200 px-8 py-6 w-full">
            <div className="h-6 w-1/3 bg-gray-300 rounded mb-3"></div>
            <div className="h-4 w-2/3 bg-gray-300 rounded"></div>
          </div>

          {/* Instructions box */}
          <div className="mb-6 border rounded-md p-4 bg-gray-100 border-gray-200">
            <div className="h-4 w-1/4 bg-gray-300 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 w-11/12 bg-gray-200 rounded"></div>
              <div className="h-3 w-10/12 bg-gray-200 rounded"></div>
              <div className="h-3 w-9/12 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Voter Scope Info */}
          <div className="mb-5 p-3 border rounded-md bg-gray-100 border-gray-200">
            <div className="h-4 w-1/3 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-2/3 bg-gray-200 rounded"></div>
          </div>

          {/* Dropdown placeholder */}
          <div className="mb-6">
            <div className="h-10 w-1/2 bg-gray-200 rounded-md"></div>
          </div>

          {/* Candidate categories (3 sample placeholders) */}
          <div className="mt-5 space-y-8">
            {[1, 2, 3].map((_, idx) => (
              <div key={idx}>
                {/* Section Header */}
                <div className="h-5 w-1/3 bg-gray-300 rounded mb-4"></div>

                {/* Candidate Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2].map((_, cardIdx) => (
                    <div
                      key={cardIdx}
                      className="flex flex-col lg:flex-row items-center lg:items-start gap-5 rounded-2xl border-2 border-gray-200 p-6 bg-gray-100 shadow-sm"
                    >
                      <div className="w-28 h-28 bg-gray-300 rounded-xl"></div>

                      <div className="flex flex-col flex-1 w-full space-y-3">
                        <div className="h-5 w-2/3 bg-gray-300 rounded"></div>
                        <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                          <div className="h-8 w-20 bg-gray-300 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-4 justify-end mt-8">
            <div className="h-10 w-24 bg-gray-300 rounded-md"></div>
            <div className="h-10 w-32 bg-gray-300 rounded-md"></div>
          </div>
        </div>
      </main>
    );
  }

  // Check if ballot data is available
  if (!ballotData || !ballotData.positions || ballotData.positions.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">No Ballot Data Available</p>
          <p className="text-gray-600">
            The ballot information is not available at this time. Please contact your administrator.
          </p>
          <button
            onClick={handleCancel}
            className="mt-4 px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <BallotComponent
      isLoading={loading}
      ballotData={ballotData}
      electionName={voterData?.election?.name || 'Election Name'}
      voterScope={voterData?.votingScope?.name}
      voterName={voterData?.name}
      organizationName={voterData?.organizationName}
      mode="voter"
      onCancel={handleCancel}
      onReview={handleReview}
    />
  );
};

export default BallotForm;
