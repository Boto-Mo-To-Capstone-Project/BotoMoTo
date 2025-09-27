"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BallotComponent from "@/components/BallotComponent";

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
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        {/* Loading state */}
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Loading ballot...</p>
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
      mode="voter"
      onCancel={handleCancel}
      onReview={handleReview}
    />
  );
};

export default BallotForm;
