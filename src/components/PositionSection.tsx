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
  routePrefix?: string; // Add route prefix prop for admin vs voter
}

// Fallback hardcoded data for when no positions are provided
const fallbackPositions = [
  {
    position: "President",
    candidates: [
      {
        id: 1,
        name: "Jane Doe",
        party: "Party A",
        votes: 250,
        imgSrc:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s",
      },
      {
        id: 2,
        name: "John Smith",
        party: "Party B",
        votes: 250,
        imgSrc:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s",
      },
      {
        id: 3,
        name: "Alice Johnson",
        party: "Party C",
        votes: 150,
        imgSrc:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s",
      },
    ],
  },
  {
    position: "Vice President",
    candidates: [
      {
        id: 4,
        name: "Bob Lee",
        party: "Party D",
        votes: 300,
        imgSrc:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s",
      },
      {
        id: 5,
        name: "Sara Kim",
        party: "Party E",
        votes: 100,
        imgSrc:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s",
      },
    ],
  },
];

const PositionSection = ({ positions, routePrefix = "/voter/live-dashboard" }: PositionSectionProps) => {
  // Use API data if available, otherwise fallback to hardcoded data
  const displayPositions = positions || [];
  const useFallback = !positions || positions.length === 0;

  return (
    <section className="grid grid-cols-1 md:grid-cols-1 gap-8 w-full">
      {useFallback ? (
        // Render fallback data with original structure
        fallbackPositions.map((pos) => {
          const maxVotes = Math.max(...pos.candidates.map((c) => c.votes));
 
          return (
            <div key={pos.position}>
              <SectionHeaderContainer variant="yellow">{pos.position}</SectionHeaderContainer>
              <div className="flex flex-col gap-4">
                {pos.candidates.map((candidate) => (
                  <CandidateDashboardCard
                    id={candidate.id}
                    key={candidate.id}
                    imgSrc={candidate.imgSrc}
                    name={candidate.name}
                    party={candidate.party}
                    votes={candidate.votes}
                    maxVotes={maxVotes}
                    routePrefix={routePrefix}
                  />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        // Render API data with new structure
        displayPositions.map((position) => {
          const maxVotes = Math.max(...position.candidates.map((c) => c.voteCount), 1); // Prevent division by 0
 
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
                      imgSrc={candidate.image} // Default image for now
                      name={candidate.name}
                      party={candidate.party?.name || "Independent"}
                      partyColor={candidate.party?.color || undefined}
                      votes={candidate.voteCount}
                      maxVotes={maxVotes}
                      routePrefix={routePrefix}
                    />
                  ))}
                </div>
                )}
            </div>
          );
        })
      )}
    </section>
  );
};
export default PositionSection;
