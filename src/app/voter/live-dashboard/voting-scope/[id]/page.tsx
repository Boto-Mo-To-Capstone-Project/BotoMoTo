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
      <main className={`flex flex-col items-center gap-10 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-8' : 'pt-40'} text-justify px-10`}>
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray">Loading voting scope results...</p>
            {isConnected && <p className="text-sm text-secondary">📡 Connected to live updates</p>}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !results) {
    return (
      <main className={`flex flex-col items-center gap-10 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-8' : 'pt-40'} text-justify px-10`}>
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center space-y-4">
            <div className="bg-primary/10 border border-primary rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Unable to Load Voting Scope Results</h3>
              <p className="text-gray">{error || "Failed to load voting scope data"}</p>
            </div>
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
    <main className={`flex flex-col items-center gap-6 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-8' : 'pt-30'} text-justify px-10`}>
      <div className="w-full max-w-7xl flex flex-col items-center">
        {/* Red Header Card - Full Width */}
        <div className="flex items-center rounded-2xl bg-red-800 px-6 py-4 relative overflow-hidden w-full mb-4">
          <div>
            <h2 className="text-white text-xl font-semibold mb-1">
              {results?.election?.name || "Loading Election..."} ({scopeName})
            </h2>
            <p className="text-white text-sm">
              {results?.election?.organization || "Loading Organization..."} 
            </p>
          </div>
        </div>

        {/* Live Dashboard Status - Below Header, Left Aligned */}
        <div className="flex items-center justify-between w-full mb-4 gap-2">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className={`text-lg font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Live Dashboard' : 'Disconnected'}
            </span>
          </div>
          <SubmitButton
            variant="action-primary"
            onClick={() => router.push("/voter/live-dashboard")}
            label="Return to Live Dashboard"/>
        </div>

        {/* kpi section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full mb-6">
          <div className="bg-blue-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Vote Count" 
              value={scopeVotersWhoVoted} 
              icon={Vote} 
            />
          </div>
          <div className="bg-green-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Registered Voters" 
              value={scopeTotalVoters} 
              icon={Users} 
            />
          </div>
          <div className="bg-purple-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Voter Turnout" 
              value={`${scopeVoterTurnout}%`} 
              icon={BarChart2} 
            />
          </div>
          <div className="bg-orange-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Voting Ends In" 
              value={timeLeft || "Calculating..."} 
              icon={Clock} 
            />
          </div>
        </div>

        {/* position section */}
        {scopePositions.length > 0 ? (
          <>
            <div className="w-full">
              <div className="bg-secondary/10 border border-secondary rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-black mb-2">
                  Positions for {scopeName}
                </h3>
                <p className="text-gray">
                  Showing {scopePositions.length} position{scopePositions.length !== 1 ? 's' : ''} 
                  {scopePositions.length > 0 && `: ${scopePositions.map(p => p.name).join(', ')}`}
                </p>
              </div>
            </div>
            <PositionSection positions={scopePositions} />
          </>
        ) : (
          <div className="mt-10 w-full">
            <div className="bg-white border border-gray/20 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray mb-2">
                No Positions Available
              </h3>
              <p className="text-gray">
                There are no positions configured for {scopeName} in this election.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default DemographicDashboard;
