"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Vote, Users, BarChart2, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";

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
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
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
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
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
    <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
      <div className="w-4/5 flex flex-col items-center ">
        {/* page head and export btn */}
        <div className="flex flex-col items-center gap-10 justify-between xl:flex-row w-full">
          <div className="text-center xl:text-start space-y-2 ">
            <p className="voter-election-heading">
              {results.election.name} ({scopeName})
            </p>
            <p className="voter-election-desc">
              {results.election.organization}
            </p>
          </div>

          {/* will remove later  */}
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary' : 'bg-primary'}`}></div>
            <span className="text-sm text-gray">
              {isConnected ? 'Live Updates' : 'Disconnected'}
            </span>
          </div>
        </div>
        {/* kpi section */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full mt-10">
          <KpiCard 
            name="Vote Count" 
            value={scopeVotersWhoVoted} 
            icon={Vote} 
          />
          <KpiCard 
            name="Registered Voters" 
            value={scopeTotalVoters} 
            icon={Users} 
          />
          <KpiCard 
            name="Voter Turnout" 
            value={`${scopeVoterTurnout}%`} 
            icon={BarChart2} 
          />
          <KpiCard 
            name="Voting Ends In" 
            value={timeLeft || "Calculating..."} 
            icon={Clock} 
          />
        </div>
        {/* position section */}
        {scopePositions.length > 0 ? (
          <>
            <div className="mt-10 w-full">
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
