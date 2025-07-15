"use client";

import CandidateDashboardCard from "./CandidateDashboardCard";
import SectionHeaderContainer from "./SectionHeaderContainer";

const positions = [
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

const PositionSection = () => {
  return (
    <section className="mt-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ">
        {positions.map((pos) => {
          const maxVotes = Math.max(...pos.candidates.map((c) => c.votes));

          return (
            <div key={pos.position}>
              <SectionHeaderContainer>{pos.position}</SectionHeaderContainer>
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
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default PositionSection;
