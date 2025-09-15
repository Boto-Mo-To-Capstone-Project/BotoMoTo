"use client";

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
  scopes?: { id: string; name: string }[]; // 👈 add available scopes
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
  const availableParties = [
    ...new Set(
      ballotData.positions
        .flatMap(pos => pos.candidates)
        .map(candidate => candidate.party)
        .filter(Boolean)
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
          (candidate) => Number(candidate.scopeId) === selectedScopeId
        );

        return {
          ...position,
          candidates: filteredCandidates
        };
      })
      // remove empty positions (no candidates after filter)
      .filter(position => position.candidates.length > 0);

  return (
    <main className={`flex flex-col items-center px-10 pb-20 text-justify ${mode === 'preview' ? 'pt-8' : 'pt-30'}`}>
      <div className="w-full flex flex-col">
        {/* Header and subheading */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold mb-1">
            {mode === 'preview' ? 'Ballot Preview' : 'Official Ballot Form'}
          </h2>
          <p className="text-base text-red-800 mb-2">
            {mode === 'preview' ? 'Preview for your' : "You're voting in the"} {isLoading ? "election" : electionName}
          </p>
        </div>

        {/* Instructions box */}
        <div className="mb-6">
          <div className="border rounded-md p-4 bg-white" style={{ borderColor: '#c62828' }}>
            <h3 className="text-base font-semibold mb-2">
              {mode === 'preview' ? 'Ballot Information' : 'Instructions for Voting'}
            </h3>
            <ul className="text-sm space-y-2 list-none">
              {mode === 'preview' ? (
                <>
                  <li>This is how the ballot will appear to voters.</li>
                  <li>Candidates are grouped by position with selection limits applied.</li>
                  <li>Preview mode - interactions are disabled.</li>
                </>
              ) : (
                <>
                  <li>1. Select the circle next to your chosen candidate's name.</li>
                  <li>2. Do not select more candidates than the allowed number for each position.</li>
                  <li>3. Click 'Check Credentials' to review the background and details of each candidates.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Voter scope information */}
        {voterScope && (
          <div className="mb-5 p-3 border rounded-md bg-blue-50 border-blue-200">
            <p className="text-base text-blue-800 font-semibold">
              Your Voting Scope: <span className="font-normal">{voterScope}</span>
            </p>
            <p className="text-sm text-blue-600 mt-1">
              You can only vote for candidates within your assigned scope.
            </p>
          </div>
        )}

        {/* Party dropdown - only show in voter mode */}
        {!isLoading && mode === 'voter' && availableParties.length > 0 && (
          <div className="mb-6">
            <Dropdown
              label="Vote Straight (Party)"
              options={availableParties}
              onSelect={handleVoteStraight}
              onClear={handleClearAllSelections}
            />
          </div>
        )}

        {/* Preview mode party info and voting scope side by side on desktop */}
        {!isLoading && mode === 'preview' && (
          <div className="flex flex-col lg:flex-row gap-5 mb-5 w-full">
            {availableParties.length > 0 && (
              <div className="flex-1 p-4 border rounded-md bg-gray-50">
                <p className="font-semibold text-base mb-1">Available Parties:</p>
                <p className="text-base text-gray-700">{availableParties.join(', ')}</p>
              </div>
            )}
            <div className="flex-1 p-4 border rounded-md bg-gray-50">
              <p className="font-semibold text-base mb-1">Available Voting Scope:</p>
              <p className="text-sm">Available Voting Scope:</p>
              <Dropdown
                options={["All Voting Scope", ...(ballotData.scopes || []).map(s => s.name)]}
                onSelect={(scope) => {
                  if (scope === "All Voting Scope") {
                    setSelectedScopeId("all");
                  } else {
                    const id = ballotData.scopes?.find((s) => s.name === scope)?.id;
                    if (id) setSelectedScopeId(Number(id));
                  }
                } } label={""}              />
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
