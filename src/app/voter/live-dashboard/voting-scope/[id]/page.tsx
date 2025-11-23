"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Vote, Users, BarChart2, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";
import { SubmitButton } from "@/components/SubmitButton";

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
      image: string
    }[];
  }[];
  demographics: {
    id: number;
    name: string;
    votersWhoVoted: number;
    percentage: number;
  }[];
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

const DemographicDashboard = () => {
  const params = useParams();
  const votingScopeId = parseInt(params.id as string, 10);
  
  // State management
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
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
    const initializeVotingScope = async () => {
      // First try to get election ID from session (secure method - same as live dashboard)
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

      console.log(`🚀 Initializing voting scope dashboard for election ${electionId}, scope ${votingScopeId}`);

      // Fetch initial data
      const fetchInitialResults = async () => {
        try {
          console.log(`🔄 Fetching voting scope data for election ${electionId}, scope ${votingScopeId}`);
          const response = await fetch(`/api/elections/${electionId}/results`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            setResults(data.data);
            setError(null);
            console.log("✅ Voting scope data loaded:", data.data);
          } else {
            throw new Error(data.message || "Failed to fetch results");
          }
        } catch (error) {
          console.error("❌ Failed to fetch voting scope data:", error);
          setError(error instanceof Error ? error.message : "Failed to load data");
        } finally {
          setLoading(false);
        }
      };

      // Connect to real-time SSE stream for live updates
      const connectToSSE = () => {
        console.log(`📡 Connecting to voting scope SSE stream for election ${electionId}`);
        
        const eventSource = new EventSource(`/api/elections/${electionId}/results/stream`);
        
        eventSource.onopen = () => {
          console.log("✅ Voting scope SSE connection established");
          setIsConnected(true);
        };

        eventSource.addEventListener('results', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📊 Initial voting scope results from SSE:", data);
            setResults(data);
            setLoading(false);
          } catch (error) {
            console.error("Failed to parse initial voting scope SSE results:", error);
          }
        });

        eventSource.addEventListener('results-update', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log("🔄 Voting scope results updated via SSE:", data);
            setResults(data);
          } catch (error) {
            console.error("Failed to parse voting scope SSE update:", error);
          }
        });

        eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
          console.log("💓 Voting scope SSE heartbeat received");
          setIsConnected(true);
        });

        eventSource.onerror = () => {
          console.log("🔌 Voting scope SSE connection lost, attempting to reconnect...");
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

    initializeVotingScope();

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up voting scope SSE connection");
    };
  }, [votingScopeId]);

  // Calculate countdown timer
  useEffect(() => {
    if (results?.election?.schedule?.dateFinish) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(results.election.schedule.dateFinish).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          const hours = Math.floor(distance / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          
          if (hours > 0) {
            setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')} hours`);
          } else {
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')} mins`);
          }
        } else {
          setTimeLeft("Voting has ended");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [results?.election?.schedule?.dateFinish]);

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
  if (error || !results) {
    return (
      <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
        (isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Election Results</h3>
            <p className="text-gray-600">{error || "Failed to load voting scope data"}</p>
          </div>
        </div>
      </main>
    );
  }

  // Find the specific voting scope from the results
  const currentScope = results.demographics.find(scope => scope.id === votingScopeId);
  const scopeName = currentScope?.name || `Voting Scope ${votingScopeId}`;

  // Filter positions that belong to this voting scope (or show all if scope is general)
  const scopePositions = results.positions.filter(position => 
    !position.votingScope || position.votingScope.id === votingScopeId
  );

  // Calculate scope-specific statistics
  const scopeVotersWhoVoted = currentScope?.votersWhoVoted || 0;
  const scopeTotalVoters = Math.round(scopeVotersWhoVoted / (currentScope?.percentage || 1) * 100) || results.overview.totalVoters;
  const scopeVoterTurnout = scopeTotalVoters > 0 ? Math.round((scopeVotersWhoVoted / scopeTotalVoters) * 100) : 0;
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
                <h1 className="text-lg font-bold text-white mb-1">
                  {results?.election?.name || "Loading Election..."} - {scopeName}
                </h1>
                <p className="text-white/90 text-sm font-medium">
                  {results?.election?.organization || "Loading Organization..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards - Modern Design with Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            name="Total Votes"
            value={scopeVotersWhoVoted}
            icon={Vote}
            variant="default"
            badge="CAST"
            color="blue"
          />
          
          <KpiCard
            name="Registered Voters"
            value={scopeTotalVoters}
            icon={Users}
            variant="default"
            badge="TOTAL"
            color="purple"
          />
          
          <KpiCard
            name="Voter Turnout"
            value={`${scopeVoterTurnout}%`}
            icon={BarChart2}
            variant="default"
            badge="RATE"
            color="pink"
          />
          
          <KpiCard
            name="Remaining"
            value={timeLeft || "Calculating..."}
            icon={Clock}
            variant="default"
            badge="TIME"
            color="emerald"
          />
        </div>

        {/* Position Results */}
        {(isAdminContext || isSuperAdminContext) && (
        <div>
          {scopePositions.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="bg-gradient-to-r from-[#7b1c1c] to-[#5c0000] px-6 py-4">
                <h2 className="text-white text-sm font-semibold flex items-center gap-2">
                  Positions for {scopeName}
                </h2>
                <p className="text-white/80 text-xs mt-1">
                  Showing {scopePositions.length} position{scopePositions.length !== 1 ? 's' : ''} 
                  {scopePositions.length > 0 && `: ${scopePositions.map(p => p.name).join(', ')}`}
                </p>
              </div>
              <div className="p-6">
                <PositionSection positions={scopePositions} />
              </div>
            </div>
            ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300 p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Positions Available
              </h3>
              <p className="text-gray-600">
                There are no positions configured for {scopeName} in this election.
              </p>
            </div>
          )}
        </div>
        )}


      </div>
    </main>
  );
}

export default DemographicDashboard;
