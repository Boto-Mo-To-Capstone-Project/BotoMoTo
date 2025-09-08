"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BallotComponent from "@/components/BallotComponent";

const BallotForm = () => {
  const router = useRouter();
  const [voterData, setVoterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get voter data from localStorage
    const storedData = localStorage.getItem("voterData");
    if (storedData) {
      const data = JSON.parse(storedData);
      console.log("Voter Data loaded:", data); // Debug log
      setVoterData(data);
    } else {
      // If no voter data, redirect to login
      router.push("/voter/login");
    }
  }, [router]);

  // Get ballot data from localStorage (from voter login API response)
  const getBallotData = () => {
    if (!voterData?.ballotData) {
      // Fallback structure if no ballot data available
      return {
        positions: [],
        parties: []
      };
    }

    // Use ballot data from API
    return voterData.ballotData;
  };

  const handleCancel = () => {
    router.push("/voter/election-terms-conditions");
  };

  const handleReview = () => {
    router.push("/voter/ballot-form/review");
  };

  if (!voterData) {
    return (
      <main className="flex flex-col items-center justify-center gap-10 px-10 pb-20 pt-40">
        {/* new loading state baka gawin ko rin sa ibang pages */}
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Loading ballot...</p>
        </div>
      </main>
    );
  }

  const ballotData = getBallotData();

  // Check if ballot data is available
  if (!ballotData.positions || ballotData.positions.length === 0) {
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
      electionName={voterData.election?.name || 'Election Name'}
      voterScope={voterData.voter?.votingScope?.name}
      mode="voter"
      onCancel={handleCancel}
      onReview={handleReview}
    />
  );
};

export default BallotForm;
