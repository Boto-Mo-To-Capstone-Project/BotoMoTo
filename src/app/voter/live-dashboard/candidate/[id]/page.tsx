"use client";

import { useState, useEffect } from "react";
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

// Type definitions for API data
interface ElectionResults {
  overview: {
    totalVoters: number;
    votersWhoVoted: number;
    voterTurnout: number;
    recentVotes: number;
  };
  positions: {
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
    }[];
  }[];
  demographics: any[];
  election: {
    id: number;
    name: string;
    status: string;
    organization: string;
    schedule: {
      dateFinish: string;
    };
  };
  timestamp: string;
}

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
  
  // State management
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Get election ID (same logic as live dashboard)
  const getElectionId = (): number | null => {
    try {
      // Try to get from localStorage voter data first
      const voterData = localStorage.getItem("voterData");
      if (voterData) {
        const parsed = JSON.parse(voterData);
        if (parsed?.election?.id) {
          return parsed.election.id;
        }
      }
      
      // Temporary: hardcode election ID for testing
      console.log("⚠️ Using hardcoded election ID for testing");
      return 2; // Change this to an existing election ID in your database
      
    } catch (error) {
      console.error("Error getting election ID:", error);
      return 1; // Fallback to election ID 1 for testing
    }
  };

  // Fetch initial results and set up real-time updates
  useEffect(() => {
    const electionId = getElectionId();
    if (!electionId) {
      setError("No election ID found");
      setLoading(false);
      return;
    }

    // Fetch initial data
    const fetchInitialResults = async () => {
      try {
        console.log(`🔄 Fetching candidate data for election ${electionId}`);
        const response = await fetch(`/api/elections/${electionId}/results`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setResults(data.data);
          setError(null);
          console.log("✅ Candidate data loaded:", data.data);
        } else {
          throw new Error(data.message || "Failed to fetch results");
        }
      } catch (error) {
        console.error("❌ Failed to fetch candidate data:", error);
        setError(error instanceof Error ? error.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    // Connect to real-time SSE stream for live updates
    const connectToSSE = () => {
      console.log(`📡 Connecting to candidate SSE stream for election ${electionId}`);
      
      const eventSource = new EventSource(`/api/elections/${electionId}/results/stream`);
      
      eventSource.onopen = () => {
        console.log("✅ Candidate SSE connection established");
        setIsConnected(true);
      };

      eventSource.addEventListener('results', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📊 Initial candidate results from SSE:", data);
          setResults(data);
          setLoading(false);
        } catch (error) {
          console.error("Failed to parse initial candidate SSE results:", error);
        }
      });

      eventSource.addEventListener('results-update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("🔄 Candidate results updated via SSE:", data);
          setResults(data);
        } catch (error) {
          console.error("Failed to parse candidate SSE update:", error);
        }
      });

      eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
        console.log("💓 Candidate SSE heartbeat received");
        setIsConnected(true);
      });

      eventSource.onerror = () => {
        console.log("🔌 Candidate SSE connection lost, attempting to reconnect...");
        setIsConnected(false);
        
        // Clean up and retry
        eventSource.close();
        setTimeout(() => {
          fetchInitialResults();
          connectToSSE();
        }, 5000);
      };

      return eventSource;
    };

    // Start with initial fetch, then connect to stream
    fetchInitialResults().then(() => {
      connectToSSE();
    });

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up candidate SSE connection");
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600">Loading live election results...</p>
            {isConnected && <p className="text-sm text-green-600">📡 Connected to live updates</p>}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center space-y-4">
            <div className="bg-primary/10 border border-primary rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Unable to Load Election Results</h3>
              <p className="text-gray">{error}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Find the candidate + position from API data
  const position = results?.positions.find((pos) =>
    pos.candidates.some((c) => c.id === candidateId)
  );

  if (!position) {
    return (
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center">
            <p className="voter-election-heading">Candidate Not Found</p>
            <p className="voter-election-desc">The candidate with ID {candidateId} was not found in this election.</p>
          </div>
        </div>
      </main>
    );
  }

  const selectedCandidate = position.candidates.find(
    (c) => c.id === candidateId
  );

  const maxVotes = Math.max(...position.candidates.map((c) => c.voteCount), 1);

  // Prepare Bar Chart data using real API data
  const barData = {
    labels: position.candidates.map((c) => c.name),
    datasets: [
      {
        label: "Votes",
        data: position.candidates.map((c) => c.voteCount),
        backgroundColor: position.candidates.map((c) =>
          c.id === candidateId ? "#800000" : "#b8b8b9ff"
        ),
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Vote Comparison - ${position.name}`,
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
                {results?.election.name}
              </p>
              <p className="voter-election-desc">
                {results?.election.organization}
              </p>
            </div>

            {/* will remove later, nly for dev */}
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary' : 'bg-primary'}`}></div>
              <span className="text-sm text-gray">
                {isConnected ? 'Live Updates' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex flex-col-reverse items-start w-full gap-10 mt-10 xl:flex-row">
            {/* candidate list */}
            <div className="w-full xl:w-1/3">
              <SectionHeaderContainer>
                {position.name}
              </SectionHeaderContainer>
              <div className="flex flex-col gap-4 mt-4">
                {position.candidates.map((candidate) => (
                  <CandidateDashboardCard
                    key={candidate.id}
                    id={candidate.id}
                    imgSrc="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHfpIhAPZHSbZstaGEgFBIjZZ-Y-K533dag&s" // Default image for now
                    name={candidate.name}
                    party={candidate.party?.name || "Independent"}
                    votes={candidate.voteCount}
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
                {position.name})
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
