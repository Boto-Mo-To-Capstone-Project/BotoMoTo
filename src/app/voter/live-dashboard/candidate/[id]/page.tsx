"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import Button from "@/components/Button";
import { SubmitButton } from "@/components/SubmitButton";

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
      image: string | null;
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
  const [isAdminContext, setIsAdminContext] = useState(false);
  const [isSuperAdminContext, setIsSuperAdminContext] = useState(false);

  const router = useRouter();

  // Check if we're in admin context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminContext = sessionStorage.getItem("adminContext") === "true";
      setIsAdminContext(adminContext);
      const superAdminContext = sessionStorage.getItem("superAdminContext") === "true";
      setIsSuperAdminContext(superAdminContext);
    }
  }, []);

  // Get election ID from admin context only (same logic as live dashboard)
  const getElectionIdFromAdmin = (): number | null => {
    try {
      if (typeof window !== 'undefined') {
        const adminElectionId = sessionStorage.getItem("adminElectionId");
        if (adminElectionId) {
          console.log(`🔄 Using election ID from admin context: ${adminElectionId}`);
          return parseInt(adminElectionId, 10);
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting admin election ID:", error);
      return null;
    }
  };

  // Get election ID from voter session (async version - same as live dashboard)
  const getElectionIdFromSession = async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.voter?.election?.id) {
          console.log("✅ Got election ID from session:", data.voter.election.id);
          return data.voter.election.id;
        }
      }
    } catch (e) {
      console.log("No voter session found");
    }
    return null;
  };

  // Fetch initial results and set up real-time updates
  useEffect(() => {
    const initializeCandidate = async () => {
      // First try to get election ID from session (secure method)
      let electionId = await getElectionIdFromSession();
      
      // If no voter session, check if admin context exists  
      if (!electionId) {
        electionId = getElectionIdFromAdmin();
      }

      if (!electionId) {
        setError("No election ID found");
        setLoading(false);
        return;
      }

      console.log(`🚀 Initializing candidate dashboard for election ${electionId}`);

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
    };

    initializeCandidate();

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up candidate SSE connection");
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
        (isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="h-8 bg-gray-200 rounded w-96 mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
        (isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Election Results</h3>
            <p className="text-gray-600">{error || "Failed to load candidate data"}</p>
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
      <main className={`flex flex-col items-center gap-10 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-8' : 'pt-40'} text-justify px-10`}>
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
    <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
      (isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="pdf-export-content">
        {/* Live Status Bar - Clean Toolbar */}
        <div className={`sticky ${
          (isAdminContext || isSuperAdminContext) ? 'top-16' : 'top-20'
        } z-50 bg-white flex items-center justify-between gap-4 py-3 px-5 mb-6 transition-all duration-300`}>
          {/* Connection Status */}
          <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
            isConnected 
              ? 'bg-emerald-50 border border-emerald-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`}></div>
              {isConnected && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
              )}
            </div>
            <span className={`text-sm font-semibold ${
              isConnected ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {isConnected ? 'Live Updates Active' : 'Connection Lost'}
            </span>
          </div>

          {/* Return to Dashboard Button */}
          <button
            onClick={() => router.push("/voter/live-dashboard")}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#7b1c1c] hover:bg-[#5c0000] rounded-lg border border-[#5c0000] transition-colors"
          >
            Return to Dashboard
          </button>
        </div>

        {/* Election Header - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-6 py-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-md font-bold text-white mb-1">
                  {results?.election?.name || "Loading Election..."} - {selectedCandidate?.name}
                </h1>
                <p className="text-white/90 text-sm font-medium">
                  {results?.election?.organization || "Loading Organization..."}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse items-start w-full gap-10 xl:flex-row">
          {/* candidate list */}
          <div className="w-full xl:w-1/2">
            <SectionHeaderContainer variant="yellow">
              {position.name}
              {position.votingScope ? (
                <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">
                  Scope: {position.votingScope.name}
                </span>
              ) : null}
            </SectionHeaderContainer>
            <div className="w-full grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-1 gap-6 mt-4">
              {position.candidates.map((candidate) => (
                <CandidateDashboardCard
                  key={candidate.id}
                  id={candidate.id}
                  imgSrc={candidate.image || "/assets/placeholderuser.png"}
                  name={candidate.name}
                  party={candidate.party?.name || "Independent"}
                  partyColor={candidate.party?.color || undefined}
                  votes={candidate.voteCount}
                  maxVotes={maxVotes}
                  highlight={candidate.id === candidateId}
                />
              ))}
            </div>
          </div>
          {/* Bar Chart */}
          <div className="w-full xl:w-1/2">
            <SectionHeaderContainer variant="yellow">
              Vote Comparison for <b>{selectedCandidate?.name}</b>
              <span className="bg-primary/5 text-sm align-center font-bold ml-2 rounded-xl py-1 px-2 text-primary">{position.name}</span>
            </SectionHeaderContainer>
            <div className="w-full h-[400px]">
              <Bar data={barData} options={barOptions} />
            </div>
            {/* Fixed height container */}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CandidateDashboard;
