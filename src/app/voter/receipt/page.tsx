"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";
import CandidateRow from "@/components/CandidateRow";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { useState, useEffect } from "react";

const VoteReceipt = () => {
  const [voterData, setVoterData] = useState<any>(null);

  const router = useRouter(); // to go to another route

  const selections = useSelector((state: RootState) => state.ballot.selections);

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
    } 
  };

  const electionName = voterData?.election?.name;
  const voterScope = voterData?.votingScope?.name;
  
  // return this if no votes yet
  if (Object.keys(selections).length === 0) {
    return (
      <div className="flex flex-col items-center mt-40 gap-30">
        <div className="text-center space-y-2">
          <p className="voter-election-heading">Vote Receipt</p>
          <p className="voter-election-subheading">
          You're voting in the {electionName}
        </p>
        {voterScope && (
          <p className="voter-election-desc text-blue-600">
            <strong>Voting Scope:</strong> {voterScope}
          </p>
        )}
        </div>
        <p className=" voter-election-heading">No votes were selected.</p>
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
    <main className="flex flex-col items-center px-5 sm:px-20 pb-20 pt-30 text-justify pt-8 w-full">
      <div className="mb-6 rounded-2xl bg-[#a30d1a] px-8 py-6 flex flex-col items-start w-full">
        <h2 className="text-white text-xl font-semibold mb-2">Vote Receipt</h2>
        <p className="text-white text-base">
          You voted in the {electionName}
        </p>
      </div>
      {voterScope && (
        <div className="mb-5 p-3 border rounded-md bg-blue-50 border-blue-200 w-full">
          <p className="text-base text-blue-800 font-semibold">
            Voting Scope: <span className="font-normal">{voterScope}</span>
          </p>
          <p className="text-sm text-blue-600 mt-1">
            You can only vote for candidates within your assigned scope.
          </p>
        </div>
      )}
      <div className="w-full flex flex-col">
        <div className="mt-5 space-y-3 w-full">
          {Object.entries(selections).map(([position, candidates]) => (
            <div key={position}>
              <SectionHeaderContainer variant="gray">
                {position}
              </SectionHeaderContainer>
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 border border-gray-300 bg-gray-10 ">
                  <thead>
                    {/* uncomment nalang kung gusto makita ung candidate at party */}
                    <tr>
                    <th className="px-4 py-2 candidate-category-desc w-3/4">
                      Candidate
                    </th>
                    <th className="px-4 py-2 candidate-category-desc w-1/4">
                      Party
                    </th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {candidates && candidates.length > 0 ? (
                      candidates.map((candidate) => (
                        <CandidateRow
                          showCredentials={false}
                          key={candidate.name}
                          candidate={candidate}
                        />
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-red-600 py-3">
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
        <div className="mt-10 flex flex-col gap-4 w-4/5 w-auto justify-center xs:items-center">
          <div className="flex gap-3 justify-center items-center mb-5">
            <label
              htmlFor="terms-agreement"
              className="text-sm font-bold text-gray-600 sm:text-md"
            >
              Please answer the app feedback survey to help us improve the
              system. Your insights are valuable for enhancing the voting
              experience.{" "}
            </label>
          </div>
          <Button
            variant="long_primary"
            onClick={() => router.push("/voter/survey-form")}
          >
            Take Survey
          </Button>
        </div>
      </div>
    </main>
  );
};

export default VoteReceipt;
