"use client";

import CandidateDashboardCard from "./CandidateDashboardCard";
import SectionHeaderContainer from "./SectionHeaderContainer";

// Type definitions for the API data
interface Position {
  id: number;
  name: string;
  voteLimit: number;
  numOfWinners: number;
  votingScope: { id: number; name: string } | null;
  candidates: {
    id: number;
    name: string;
    party: { id: number; name: string; color: string } | null;
    voteCount: number;
    percentage: number;
    image: string;
  }[];
}

interface PositionSectionProps {
  positions?: Position[];
}


const PositionSection = ({ positions }: PositionSectionProps) => {
  // Use API data if available, otherwise fallback to hardcoded data
  const displayPositions = positions || [];

  // ✅ Show empty state if no positions
  if (!positions || positions.length === 0) {
    return (
      <div className="text-gray-600 italic text-center py-6 col-span-full">
        No positions configured for this election
      </div>
    );
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-1 gap-8 w-full">
      {displayPositions.map((position) => {
        const maxVotes = Math.max(...position.candidates.map((c) => c.voteCount), 1); // prevent div by 0

        return (
          <div key={position.id}>
            <SectionHeaderContainer variant="yellow">
              {position.name}{" "}
              {position.votingScope ? (
                <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
                  Scope: {position.votingScope.name}
                </span>
              ) : null}
            </SectionHeaderContainer>

            {position.candidates.length === 0 ? (
              <div className="text-gray-600 italic text-center py-6 col-span-full">
                No candidates assigned for this position
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-1 gap-6 mt-4">
                {position.candidates.map((candidate) => (
                  <CandidateDashboardCard
                    id={candidate.id}
                    key={candidate.id}
                    imgSrc={candidate.image}
                    name={candidate.name}
                    party={candidate.party?.name || "Independent"}
                    partyColor={candidate.party?.color || undefined}
                    votes={candidate.voteCount}
                    maxVotes={maxVotes}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};
export default PositionSection;
