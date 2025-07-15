"use client";

import { useParams } from "next/navigation";
import CandidateDashboardCard from "@/components/CandidateDashboardCard";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// -- Hardcoded positions from your code:
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

const CandidateDashboard = () => {
  const params = useParams();
  const candidateId = parseInt(params.id as string, 10);

  // Find the candidate + position
  const position = positions.find((pos) =>
    pos.candidates.some((c) => c.id === candidateId)
  );

  if (!position) {
    return <div className="p-8">Candidate not found.</div>;
  }

  const selectedCandidate = position.candidates.find(
    (c) => c.id === candidateId
  );

  const maxVotes = Math.max(...position.candidates.map((c) => c.votes));

  // Prepare Bar Chart data
  const barData = {
    labels: position.candidates.map((c) => c.name),
    datasets: [
      {
        label: "Votes",
        data: position.candidates.map((c) => c.votes),
        backgroundColor: position.candidates.map((c) =>
          c.id === candidateId ? "#800000" : "#b8b8b9ff"
        ),
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false, // Add this to disable aspect ratio maintenance
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Vote Comparison - ${position.position}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <>
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
        <div className="w-4/5 flex flex-col items-center ">
          {/* page head and export btn */}
          <div className="flex flex-col items-center gap-10 justify-between xl:flex-row w-full">
            <div className="text-center xl:text-start space-y-2 ">
              <p className="voter-election-heading">
                2025 Election of Provident
              </p>
              <p className="voter-election-desc">
                Polytechnic University of the Philippines (PUP) Provident Fund
              </p>
            </div>
            {/* <Button variant="long_primary">Export Results</Button> */}
          </div>
          <div className="flex flex-col-reverse items-start w-full gap-10 mt-10 xl:flex-row">
            {/* candidate list */}
            <div className="w-full xl:w-1/3">
              <SectionHeaderContainer>
                {position.position}
              </SectionHeaderContainer>
              <div className="flex flex-col gap-4 mt-4">
                {position.candidates.map((candidate) => (
                  <CandidateDashboardCard
                    key={candidate.id}
                    id={candidate.id}
                    imgSrc={candidate.imgSrc}
                    name={candidate.name}
                    party={candidate.party}
                    votes={candidate.votes}
                    maxVotes={maxVotes}
                    highlight={candidate.id === candidateId}
                  />
                ))}
              </div>
            </div>
            {/* Bar Chart */}
            <div className="w-full xl:w-2/3">
              <SectionHeaderContainer>
                Vote Comparison for {selectedCandidate?.name} (
                {position.position})
              </SectionHeaderContainer>
              <div className="w-full h-[400px]">
                <Bar data={barData} options={barOptions} />
              </div>
              {/* Fixed height container */}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CandidateDashboard;
