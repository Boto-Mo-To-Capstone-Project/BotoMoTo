"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";
import CandidateRow from "@/components/CandidateRow";
import { useState } from "react";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";

const ReviewPage = () => {
  const [isChecked, setIsChecked] = useState(false); // so checkbutton must be clicked before proceeding

  const router = useRouter(); // to go to another route

  const selections = useSelector((state: RootState) => state.ballot.selections);

  // return this if no votes yet
  if (Object.keys(selections).length === 0) {
    return (
      <div className="flex flex-col items-center mt-40 gap-30">
        <div className="text-center space-y-2">
          <p className="voter-election-heading">Ballot Form Review</p>
          <p className=" voter-election-subheading">
            You're voting in the 2025 Election of Provident
          </p>
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
        <p className="voter-election-heading">Ballot Form Review</p>
        <p className="voter-election-subheading">
          You're voting in the 2025 Election of Provident
        </p>
      </div>
      <div className="xs:w-full lg:w-3/5 flex flex-col flex-wrap">
        <div className="mt-5 space-y-3 w-full">
          {Object.entries(selections).map(([position, candidates]) => (
            <div key={position} className="">
              <SectionHeaderContainer variant="yellow">
                {position}
                <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
                  You selected {candidates?.length}
                </span>
              </SectionHeaderContainer>

              <table className="w-full divide-y divide-gray-200 border border-gray-300 bg-gray-10">
                <thead>
                  <tr>
                    <th className="px-4 py-2 candidate-category-desc w-3/5">
                      Candidate
                    </th>
                    <th className="px-4 py-2 candidate-category-desc w-1/5">
                      Party
                    </th>
                    <th className="px-4 py-2 text-center candidate-category-desc w-1/5">
                      View Credentials
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {candidates && candidates.length > 0 ? (
                    candidates.map((candidate) => (
                      <CandidateRow
                        key={candidate.name}
                        candidate={candidate}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center text-red-600 py-3">
                        No candidate selected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!isChecked}
              onClick={() => router.push("/voter/receipt")}
            >
              Submit Vote
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ReviewPage;
