"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import { Candidate } from "@/types";
import Dropdown from "@/components/Dropdown";
import CandidateCategory from "@/components/CandidateCategory";

import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import {
  selectCandidate,
  deselectCandidate,
  clearSelections,
  voteStraight,
} from "@/store/ballotSlice";

interface BallotData {
  positions: {
    name: string;
    maxSelections: number;
    candidates: Candidate[];
  }[];
  parties?: string[];
  scopes?: { id: number; name: string }[]; // 👈 add available scopes
}

interface BallotComponentProps {
  ballotData: BallotData;
  electionName: string;
  mode: 'voter' | 'preview';
  voterScope?: string; // Add scope information
  onCancel?: () => void;
  onReview?: () => void;
  onBack?: () => void;
  isLoading: boolean
}

const BallotComponent = ({ 
  // Get selections from Redux (for modal logic)
  // If you already have selections as a prop, use that instead
  // Otherwise, you may need to pass it in or useSelector here
  ballotData, 
  electionName, 
  mode, 
  voterScope,
  onCancel, 
  onReview,
  onBack,
  isLoading
}: BallotComponentProps) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 👇 get selections from Redux
  const selections = useSelector((state: RootState) => state.ballot.selections);

  // check if at least one candidate is selected
  const hasSelections = Object.values(selections).some(
    (selected) => selected && selected.length > 0
  );

  useEffect(() => {
    if (mode === "voter") {
      dispatch(clearSelections());
    }
  }, [dispatch, mode]);

  // Clear selections when component loads (only in voter mode)
  useEffect(() => {
    if (mode === 'voter') {
      dispatch(clearSelections());
    }
  }, [dispatch, mode]);

  // Redux dispatch when selecting a candidate (only in voter mode)
  const handleSelectCandidate = (position: string, candidate: Candidate) => {
    if (mode === 'voter') {
      dispatch(selectCandidate({ position, candidate }));
    }
  };

  // Redux dispatch when deselecting a candidate (only in voter mode)
  const handleDeselectCandidate = (position: string, candidateId: string) => {
    if (mode === 'voter') {
      dispatch(deselectCandidate({ position, candidateId }));
    }
  };

  // Handle vote straight by party
  const handleVoteStraight = (party: string) => {
    if (mode === 'voter') {
      dispatch(voteStraight({ party, ballotData }));
    }
  };

  // Handle clearing all selections
  const handleClearAllSelections = () => {
    if (mode === 'voter') {
      dispatch(clearSelections());
    }
  };

  // Convert ballot data to the format expected by existing components
  const candidatesByPosition: Record<string, Candidate[]> = {};
  const selectionLimits: Record<string, number> = {};

  ballotData.positions.forEach(position => {
    candidatesByPosition[position.name] = position.candidates;
    selectionLimits[position.name] = position.maxSelections;
  });

  // Get unique parties from candidates in current ballot scope (better filtering)
  // Filter out "Independent" as it shouldn't be available for straight party voting
  const availableParties = [
    ...new Set(
      ballotData.positions
        .flatMap(pos => pos.candidates)
        .map(candidate => candidate.party)
        .filter(Boolean)
        .filter(party => party.toLowerCase() !== 'independent')
    )
  ];

  // state management for selected voting scope dropdown
  const [selectedScopeId, setSelectedScopeId] = useState<"all" | number>("all");

  // state management for selected voting scope dropdown
  const filteredPositions = selectedScopeId === "all"
  ? ballotData.positions
  : ballotData.positions
      .map(position => {
        // Filter candidates of this position by selected scope
        const filteredCandidates = position.candidates.filter(
          (candidate) => candidate.scopeId === selectedScopeId
        );

        return {
          ...position,
          candidates: filteredCandidates
        };
      })
      // remove empty positions (no candidates after filter)
      .filter(position => position.candidates.length > 0);

  return (
    <main className={`flex flex-col items-center px-5 pb-20 text-justify ${mode === 'preview' ? 'pt-8 xl:px-20' : 'pt-30 sm:px-20 '}`}>
      <div className="w-full flex flex-col">
        {/* Header and subheading - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-8 py-6">
            <div className="flex flex-col items-start">
              <h2 className="text-md font-bold text-white mb-2">
                {mode === 'preview' ? 'Ballot Preview' : 'Official Ballot Form'}
              </h2>
              <p className="text-white text-sm font-semibold">
                {mode === 'preview' ? 'Preview for your' : "You're voting in the"} {isLoading ? "election" : electionName}
              </p>
            </div>
          </div>
        </div>

        {/* Main information grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Instructions box */}
          <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
            <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
              <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
              <h3 className="text-sm font-semibold text-gray-900">
                {mode === 'preview' ? 'Ballot Information' : 'Instructions for Voting'}
              </h3>
            </div>
            <ul className="text-sm space-y-1 list-none text-gray-600">
              {mode === 'preview' ? (
                <>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-0.5"></div>
                    <span>This is how the ballot will appear to voters.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-0.5"></div>
                    <span>Candidates are grouped by position with selection limits applied.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#7b1c1c]/70 mt-0.5"></div>
                    <span>Preview mode - interactions are disabled.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-1.5">
                    <span className="font-medium text-[#7b1c1c] min-w-[12px]">1.</span>
                    <span>Select the circle next to your chosen candidate's name.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-medium text-[#7b1c1c] min-w-[12px]">2.</span>
                    <span>Do not select more candidates than the allowed number for each position.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-medium text-[#7b1c1c] min-w-[12px]">3.</span>
                    <span>Click 'Check Credentials' to review the background and details of each candidates.</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Voter scope and Party selection */}
          <div className="space-y-4">
            {/* Voter scope information */}
            {voterScope && (
              <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
                <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
                  <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
                  <h3 className="text-sm font-semibold text-gray-900">Your Voting Scope</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-[#7b1c1c]/5 text-[#7b1c1c] px-2 py-1 rounded font-medium">
                    {voterScope}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    (You can only vote within this scope)
                  </span>
                </div>
              </div>
            )}

            {/* Party dropdown - only show in voter mode */}
            {!isLoading && mode === 'voter' && availableParties.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-3">
                <div className="flex items-center border-b border-[#7b1c1c]/10 pb-2 mb-2">
                  <div className="w-1 h-4 bg-[#7b1c1c] rounded mr-2"></div>
                  <h3 className="text-sm font-semibold text-gray-900">Vote Straight by Party</h3>
                </div>
                <Dropdown
                  label=""
                  options={availableParties}
                  onSelect={handleVoteStraight}
                  onClear={handleClearAllSelections}
                />
              </div>
            )}
          </div>
        </div>

        {/* Combined box for parties and voting scope in preview mode */}
        {!isLoading && mode === 'preview' && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-[#7b1c1c]/20 p-4">
              {availableParties.length > 0 && (
                <div className="mb-4">
                  <div className="border-l-4 border-[#7b1c1c] pl-3 mb-3">
                    <h3 className="text-base font-semibold text-gray-900">Available Parties</h3>
                  </div>
                  <div className="text-sm text-gray-600 pl-3 flex flex-wrap gap-1.5">
                    {availableParties.map((party, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-[#7b1c1c]/5 text-[#7b1c1c] font-medium">
                        {party}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#7b1c1c]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#7b1c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0020 5.5V3.935M3.055 11a7 7 0 0113.89 0M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Voting Scope Selection</h3>
                </div>
                <div className="pl-11">
                  <div className="text-sm text-gray-600 mb-3">Select the scope to filter candidates:</div>
                  <Dropdown
                    options={["All Voting Scope", ...(ballotData.scopes || []).map(s => s.name)]}
                    onSelect={(scope) => {
                      if (scope === "All Voting Scope") {
                        setSelectedScopeId("all");
                      } else {
                        const scopeObj = ballotData.scopes?.find((s) => s.name === scope);
                        if (scopeObj) setSelectedScopeId(scopeObj.id);
                      }
                    }}
                    label={""}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Candidate categories */}
        <div className="mt-5">
          {filteredPositions.map((pos, idx) => (
            <CandidateCategory
              key={pos.name + '-' + idx}
              position={pos.name}
              selectCount={pos.maxSelections}
              candidateList={pos.candidates}
              scopes={ballotData.scopes || []}
              onSelectCandidate={(candidate: Candidate) =>
                handleSelectCandidate(pos.name, candidate)
              }
              onDeselectCandidate={(candidate: Candidate) =>
                handleDeselectCandidate(pos.name, candidate.id)
              }
              disabled={mode === 'preview'}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-end mt-8">
          {mode === 'voter' ? (
            <>
              <Button
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={onReview}
                disabled={!hasSelections}
              >
                Review Vote
              </Button>
            </>
          ) : (
            // Preview mode buttons
            <Button
              variant="secondary"
              onClick={onBack}
            >
              Back to Election
            </Button>
          )}
        </div>
      </div>
    </main>
  );
};

export default BallotComponent;
