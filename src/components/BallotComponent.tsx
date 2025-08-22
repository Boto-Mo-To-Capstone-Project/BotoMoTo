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
} from "@/store/ballotSlice";

interface BallotData {
  positions: {
    name: string;
    maxSelections: number;
    candidates: Candidate[];
  }[];
  parties?: string[];
}

interface BallotComponentProps {
  ballotData: BallotData;
  electionName: string;
  mode: 'voter' | 'preview';
  onCancel?: () => void;
  onReview?: () => void;
  onBack?: () => void;
}

const BallotComponent = ({ 
  ballotData, 
  electionName, 
  mode, 
  onCancel, 
  onReview,
  onBack 
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
  const handleDeselectCandidate = (position: string, candidateName: string) => {
    if (mode === 'voter') {
      dispatch(deselectCandidate({ position, candidateName }));
    }
  };

  // Convert ballot data to the format expected by existing components
  const candidatesByPosition: Record<string, Candidate[]> = {};
  const selectionLimits: Record<string, number> = {};

  ballotData.positions.forEach(position => {
    candidatesByPosition[position.name] = position.candidates;
    selectionLimits[position.name] = position.maxSelections;
  });

  // Get unique parties from candidates (fallback if not provided)
  const parties = ballotData.parties || [
    ...new Set(
      ballotData.positions
        .flatMap(pos => pos.candidates)
        .map(candidate => candidate.party)
        .filter(Boolean)
    )
  ];

  return (
    <main className="flex flex-col items-center gap-10 px-10 pb-20 pt-40 text-justify">
      <div className="text-center space-y-2">
        <p className="voter-election-heading">
          {mode === 'preview' ? 'Ballot Preview' : 'Official Ballot Form'}
        </p>
        <p className="voter-election-subheading">
          {mode === 'preview' ? 'Preview for' : "You're voting in the"} {electionName}
        </p>
      </div>
      
      <div className="w-full lg:w-3/5 flex flex-col">
        <div className="mb-10">
          <p className="voter-election-desc">
            <strong>
              {mode === 'preview' ? 'Ballot Information' : 'Instructions for Voting'}
            </strong>
          </p>
          <li className="list-none voter-election-desc space-y-3 mt-2">
            {mode === 'preview' ? (
              <>
                <ul>This is how the ballot will appear to voters.</ul>
                <ul>Candidates are grouped by position with selection limits applied.</ul>
                <ul>Preview mode - interactions are disabled.</ul>
              </>
            ) : (
              <>
                <ul>1. Select the circle next to your chosen candidate's name.</ul>
                <ul>
                  2. Do not select more candidates than the allowed number for each
                  position.
                </ul>
                <ul>
                  3. Click 'Check Credentials' to review the background and details
                  of each candidates.
                </ul>
              </>
            )}
          </li>
        </div>

        {/* Party dropdown - only show in voter mode */}
        {mode === 'voter' && parties.length > 0 && (
          <Dropdown
            label="Vote Straight (Party)"
            options={parties}
          />
        )}

        {/* Preview mode party info */}
        {mode === 'preview' && parties.length > 0 && (
          <div className="mb-5 p-4 border rounded-md bg-gray-50">
            <p className="voter-election-desc font-semibold">Available Parties:</p>
            <p className="voter-election-desc">{parties.join(', ')}</p>
          </div>
        )}

        <div className="mt-5">
          {Object.entries(candidatesByPosition).map(([position, list]) => (
            <CandidateCategory
              key={position}
              position={position}
              selectCount={selectionLimits[position] || 1}
              candidateList={list}
              onSelectCandidate={(candidate) =>
                handleSelectCandidate(position, candidate)
              }
              onDeselectCandidate={(candidate) =>
                handleDeselectCandidate(position, candidate.name)
              }
              disabled={mode === 'preview'}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-end">
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
