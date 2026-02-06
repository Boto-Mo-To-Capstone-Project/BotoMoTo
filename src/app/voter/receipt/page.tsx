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
      <main className="flex flex-col items-center px-5 pb-20 text-justify pt-30 sm:px-20 w-full">
        <div className="w-full flex flex-col">
          {/* Header and subheading - Professional Gradient */}
          <div className="relative overflow-hidden rounded-2xl shadow-lg mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
            <div className="relative px-8 py-6">
              <div className="flex flex-col items-start">
                <h2 className="text-2xl font-bold text-white mb-2">Vote Receipt</h2>
                <p className="text-white text-base font-medium opacity-90">
                  You're voting in the {electionName}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7b1c1c]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#7b1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No Votes Found</h3>
              <p className="text-sm text-gray-600 max-w-md">
                No votes were selected for this ballot. Please return to the form to make your selections.
              </p>
              {voterScope && (
                <div className="text-sm text-[#7b1c1c] bg-[#7b1c1c]/5 px-3 py-1.5 rounded-md">
                  Voting Scope: <span className="font-medium">{voterScope}</span>
                </div>
              )}
              <Button
                variant="long_secondary"
                onClick={() => router.push("/voter/ballot-form")}
              >
                Return to Ballot Form
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="flex flex-col items-center px-5 pb-20 text-justify pt-20 sm:px-20 w-full">
      <div className="w-full flex flex-col">
        {/* Header and subheading - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-8 py-6">
            <div className="flex flex-col items-start">
              <h2 className="text-2xl font-bold text-white mb-2">Vote Receipt</h2>
              <p className="text-white text-base font-medium opacity-90">
                You voted in the {electionName}
              </p>
            </div>
          </div>
        </div>

        {/* Main information grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Receipt Information box */}
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
            <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
              <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
              <h3 className="text-sm font-semibold text-gray-900">Receipt Information</h3>
            </div>
            <ul className="text-sm space-y-1 list-none text-gray-600">
              <li className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-1.5"></div>
                <span>This is your official vote receipt for the election.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-1.5"></div>
                <span>Please save or take a screenshot for your records.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-1.5"></div>
                <span>Your vote has been successfully recorded.</span>
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
                  You voted for candidates within your assigned scope.
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
                <span className="bg-[#7b1c1c]/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-[#7b1c1c]">
                  {candidates?.length} Selected
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
        
        {/* Survey Section */}
        <div className="mt-10">
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-4 mb-6">
            <div className="flex items-center border-b border-[#7b1c1c]/10 pb-3 mb-4">
              <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
              <h3 className="text-sm font-semibold text-gray-900">Feedback Survey</h3>
            </div>
            <p className="text-sm text-gray-700">
              Please help us improve the voting system by participating in our feedback survey. 
              Your insights are valuable for enhancing the voting experience for future elections.
            </p>
          </div>
          <div className="flex justify-center">
            <Button
              variant="long_primary"
              onClick={() => router.push("/voter/survey-form")}
            >
              Take the Survey
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default VoteReceipt;
