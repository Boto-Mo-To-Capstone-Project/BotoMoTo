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

  // Get voter data from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem("voterData");
    if (storedData) {
      const data = JSON.parse(storedData);
      setVoterData(data);
    }
  }, []);

  const electionName = voterData?.election?.name;
  const voterScope = voterData?.voter?.votingScope?.name;

  // Submit vote function
  const handleSubmitVote = async () => {
    if (!voterData?.voter?.code) {
      toast.error("Voter code not found. Please try logging in again.");
      return;
    }

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
          voterCode: voterData.voter.code,
          votes
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store the vote result for the receipt page
        localStorage.setItem('voteResult', JSON.stringify(result.data));
        
        // Navigate to receipt page
        router.push("/voter/receipt");
      } else {
        // Handle API errors
        const errorMessage = result.message || result.error || "Failed to submit votes";
        toast.error(errorMessage);
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
      <div className="flex flex-col items-center mt-40 gap-30">
        <div className="text-center space-y-2">
          <p className="voter-election-heading">Ballot Form Review</p>
          <p className="voter-election-subheading">
            You're voting in the {electionName}
          </p>
          {voterScope && (
            <p className="voter-election-desc text-blue-600">
              <strong>Voting Scope:</strong> {voterScope}
            </p>
          )}
        </div>
        <p className="voter-election-heading">No votes were selected.</p>
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
    <main className="flex flex-col items-center gap-10 px-10 pb-20 pt-40 text-justify">
      {/*<Toaster position="top-center" />*/} 
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Ballot Form Review</p>
        <p className="voter-election-subheading">
          You're voting in the {electionName}
        </p>
        {voterScope && (
          <p className="voter-election-desc text-blue-600">
            <strong>Voting Scope:</strong> {voterScope}
          </p>
        )}
      </div>
      <div className="w-full lg:w-2/5 flex flex-col">
        <div className="mt-5 space-y-3 w-full">
          {Object.entries(selections).map(([position, candidates]) => (
            <div key={position} className="">
              <SectionHeaderContainer variant="yellow">
                {position}
                <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
                  You selected {candidates?.length}
                </span>
              </SectionHeaderContainer>
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 border border-gray-300 bg-gray-10">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 candidate-category-desc w-3/5">
                        Candidate
                      </th>
                      <th className="px-4 py-2 candidate-category-desc w-1/5">
                        Party
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {candidates && candidates.length > 0 ? (
                      candidates.map((candidate) => (
                        <CandidateRow
                          key={candidate.name}
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
          <div className="flex gap-3 justify-center items-center">
            <input
              type="checkbox"
              id="terms-agreement"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="h-6 w-6 accent-primary flex-shrink-0"
              disabled={isSubmitting}
            />
            <label
              htmlFor="terms-agreement"
              className="text-sm text-gray-600 sm:text-md"
            >
              I confirm that my vote is final and accurate.
            </label>
          </div>
          <div className="flex gap-4 justify-end mt-2 xl:mt-10">
            <Button
              variant="secondary"
              onClick={() => router.push("/voter/ballot-form")}
              disabled={isSubmitting}
            >
              Cancel
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
