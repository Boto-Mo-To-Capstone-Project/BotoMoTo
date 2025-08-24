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
    <main className="flex flex-col items-center gap-10 px-10 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">Vote Receipt</p>
        <p className="voter-election-subheading">
          You voted in the {electionName}
        </p>
        {voterScope && (
          <p className="voter-election-desc text-blue-600">
            <strong>Voting Scope:</strong> {voterScope}
          </p>
        )}
      </div>
      <div className="w-full lg:w-3/5 flex flex-col">
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
          <div className="flex gap-3 justify-center items-center">
            <label
              htmlFor="terms-agreement"
              className="text-sm text-gray-600 sm:text-md mb-5"
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
