"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";
import CandidateRow from "@/components/CandidateRow";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

const ReviewPage = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [voterData, setVoterData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const selections = useSelector((state: RootState) => state.ballot.selections);

  // Get voter data from session (secure, session-based approach)
  useEffect(() => {
    checkSession();
  }, []);

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
      } else {
        router.push("/voter/login");
        return;
      }
    } catch (e) {
      console.error("Error checking voter session:", e);
      router.push("/voter/login");
      return;
    }
  };

  const electionName = voterData?.election?.name;
  const voterScope = voterData?.votingScope?.name;

  // Submit vote function (now uses session-based authentication)
  const handleSubmitVote = async () => {
    if (!voterData?.ballotData?.positions) {
      toast.error("Ballot data not found. Please try logging in again."); 
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert selections to the format expected by the API
      const votes: Array<{ candidateId: number; positionId: number }> = [];
      
      // Create a lookup map of position names to position IDs from ballot data
      const positionIdMap = new Map<string, number>();
      voterData.ballotData.positions.forEach((position: any) => {
        positionIdMap.set(position.name, position.id);
      });
      
      Object.entries(selections).forEach(([positionName, candidates]) => {
        const positionId = positionIdMap.get(positionName);
        if (!positionId) {
          console.warn(`Position ID not found for position: ${positionName}`);
          return;
        }
        
        if (candidates && candidates.length > 0) {
          candidates.forEach(candidate => {
            votes.push({
              candidateId: parseInt(candidate.id), // Convert string ID to number
              positionId: positionId
            });
          });
        }
      });

      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          votes // Removed voterCode - now uses session authentication
        }),
        credentials: 'include' // Ensure cookies are sent with request
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store the vote result for the receipt page (temporary localStorage for receipt)
        localStorage.setItem('voteResult', JSON.stringify(result.data));
        
        // Navigate to receipt page
        router.push("/voter/receipt");
      } else {
        // Handle API errors
        const errorMessage = result.message || result.error || "Failed to submit votes";
        toast.error(errorMessage);
        
        // If session expired or unauthorized, redirect to login
        if (response.status === 401) {
          router.push("/voter/login");
        }
      }
    } catch (error) {
      console.error("Error submitting votes:", error);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("stored data:", voterData);

  // Return this if no votes yet
  if (Object.keys(selections).length === 0) {
    return (
      <div className="flex flex-col items-center mt-40 gap-10">
        <div className="text-center space-y-2">
          <h2 className="text-sm font-semibold mb-1">Ballot Form Review</h2>
          <p className="text-xs text-red-800 mb-2">
            You're voting in the {electionName}
          </p>
          {voterScope && (
            <p className="text-xs text-blue-800 font-semibold">
              Voting Scope: <span className="font-normal">{voterScope}</span>
            </p>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-700">No votes were selected.</p>
        <Button
          variant="long_secondary"
          onClick={() => router.push("/voter/ballot-form")}
        >
          Return to form
        </Button>
      </div>
    );
  } 

  return (
    <main className="flex flex-col items-center px-5 pb-20 text-justify pt-30 sm:px-20 w-full">
      {/*<Toaster position="top-center" />*/}
      <div className="w-full flex flex-col">
        {/* Header and subheading - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-8 py-6">
            <div className="flex flex-col items-start">
              <h2 className="text-md font-bold text-white mb-2">Ballot Form Review</h2>
              <p className="text-white text-sm font-semibold">
                You're voting in the {electionName}
              </p>
            </div>
          </div>
        </div>
        {/* Main information grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Review Instructions box */}
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
            <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
              <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
              <h3 className="text-sm font-semibold text-gray-900">Review Instructions</h3>
            </div>
            <ul className="text-sm space-y-1 list-none text-gray-600">
              <li className="flex items-start gap-1.5">
                <span className="font-medium text-[#7b1c1c] min-w-[12px]">1.</span>
                <span>Please review your selections carefully before submitting.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-medium text-[#7b1c1c] min-w-[12px]">2.</span>
                <span>Confirm that all positions and candidates are correct.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-medium text-[#7b1c1c] min-w-[12px]">3.</span>
                <span>Once submitted, your vote cannot be changed.</span>
              </li>
            </ul>
          </div>

          {/* Voter scope information */}
          {voterScope && (
            <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
              <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
                <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
                <h3 className="text-sm font-semibold text-gray-900">Your Voting Scope</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-[#7b1c1c]/5 text-[#7b1c1c] px-2 py-1 rounded font-medium">
                    {voterScope}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  You can only vote for candidates within your assigned scope.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-full flex flex-col">
        <div className="space-y-3 w-full">
          {Object.entries(selections).map(([position, candidates]) => (
            <div key={position} className="">
              <SectionHeaderContainer variant="yellow" fullWidth>
                {position}
                <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
                  You selected {candidates?.length}
                </span>
              </SectionHeaderContainer>
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 border border-gray-300 bg-gray-10">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 w-3/5">
                        Candidate
                      </th>
                      <th className="px-4 py-2 text-sm font-medium text-gray-600 w-2/5">
                        Party
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {candidates && candidates.length > 0 ? (
                      candidates.map((candidate) => (
                        <CandidateRow
                          key={candidate.id ?? candidate.name}
                          candidate={candidate}
                          showCredentials={false}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center text-red-600 py-3"
                        >
                          No candidate selected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-4 mb-6">
            <div className="flex items-center border-b border-[#7b1c1c]/10 pb-3 mb-4">
              <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
              <h3 className="text-sm font-semibold text-gray-900">Final Confirmation</h3>
            </div>
            <div className="flex gap-3 items-start">
              <input
                type="checkbox"
                id="terms-agreement"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="h-5 w-5 accent-[#7b1c1c] mt-0.5 cursor-pointer"
                disabled={isSubmitting}
              />
              <label
                htmlFor="terms-agreement"
                className="text-sm text-gray-700 cursor-pointer"
              >
                I have reviewed my selections and confirm that my vote is final and accurate. I understand that this action cannot be undone once submitted.
              </label>
            </div>
          </div>
          <div className="flex gap-4 justify-end">
            <Button
              variant="secondary"
              onClick={() => router.push("/voter/ballot-form")}
              disabled={isSubmitting}
            >
              Back to Ballot
            </Button>
            <Button
              variant="primary"
              disabled={!isChecked || isSubmitting}
              onClick={handleSubmitVote}
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ReviewPage;
