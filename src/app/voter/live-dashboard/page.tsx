"use client";
import { useState, useEffect } from "react";
import Button from "@/components/Button";
import { Vote, Users, BarChart2, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";
import DemographicSection from "@/components/DemographicSection";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";

interface ElectionResults {
  overview: {
    totalVoters: number;
    votersWhoVoted: number;
    voterTurnout: number;
    recentVotes: number;
  };
  positions: any[];
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

const LiveDashboard = () => {
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Get election ID from voter data or URL params
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
      // TODO: Remove this when voter authentication is implemented
      console.log("⚠️ Using hardcoded election ID for testing");
      return 2; // Change this to an existing election ID in your database
      
    } catch (error) {
      console.error("Error getting election ID:", error);
      return 1; // Fallback to election ID 1 for testing
    }
  };

  // Fetch initial results
  const fetchInitialResults = async (electionId: number) => {
    try {
      console.log(`🔄 Fetching initial results for election ${electionId}`);
      const response = await fetch(`/api/elections/${electionId}/results`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
        setError(null);
        console.log("✅ Initial results loaded:", data.data);
      } else {
        throw new Error(data.message || "Failed to fetch results");
      }
    } catch (error) {
      console.error("❌ Failed to fetch initial results:", error);
      setError(error instanceof Error ? error.message : "Failed to load election results");
    } finally {
      setLoading(false);
    }
  };

  // Connect to real-time SSE stream
  const connectToSSE = (electionId: number) => {
    console.log(`📡 Connecting to SSE stream for election ${electionId}`);
    
    const eventSource = new EventSource(`/api/elections/${electionId}/results/stream`);
    
    eventSource.onopen = () => {
      console.log("✅ SSE connection established");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📊 Real-time update received:", data);
        setResults(data);
        setIsConnected(true);
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.addEventListener('results', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📊 Initial results from SSE:", data);
        setResults(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to parse initial SSE results:", error);
      }
    });

    eventSource.addEventListener('results-update', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔄 Results updated via SSE:", data);
        setResults(data);
      } catch (error) {
        console.error("Failed to parse SSE update:", error);
      }
    });

    eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
      console.log("💓 SSE heartbeat received");
      setIsConnected(true);
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.error("❌ SSE error:", data);
        setError(data.error || "Stream error occurred");
      } catch (error) {
        console.error("SSE error event:", error);
      }
    });

    eventSource.onerror = () => {
      console.log("🔌 SSE connection lost, attempting to reconnect...");
      setIsConnected(false);
      
      // Clean up current connection
      eventSource.close();
      
      // Fallback to initial fetch and retry SSE after delay
      setTimeout(() => {
        fetchInitialResults(electionId);
        connectToSSE(electionId);
      }, 5000);
    };

    // Cleanup function
    return () => {
      console.log("🔌 Closing SSE connection");
      eventSource.close();
      setIsConnected(false);
    };
  };

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

  // Initialize data fetching and SSE connection
  useEffect(() => {
    const electionId = getElectionId();
    
    if (electionId) {
      console.log(`🚀 Initializing live dashboard for election ${electionId}`);
      
      // First fetch initial data
      fetchInitialResults(electionId);
      
      // Then connect to real-time stream
      const cleanup = connectToSSE(electionId);
      
      // Cleanup on unmount
      return cleanup;
    } else {
      setError("No election ID found. Please ensure you're accessing this page from a valid election context.");
      setLoading(false);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
        <div className="w-4/5 flex flex-col items-center">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray">Loading live election results...</p>
            {isConnected && <p className="text-sm text-secondary">📡 Connected to live updates</p>}
          </div>
        </div>
      </main>
    );
  }

  // Error state
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

  // Main render with real data
  return (
    <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
      <div className="w-4/5 flex flex-col items-center ">
        {/* page head and export btn */}
        <div className="flex flex-col items-center gap-10 justify-between xl:flex-row w-full">
          <div className="text-center xl:text-start space-y-2 ">
            <p className="voter-election-heading">
              {results?.election?.name || "Loading..."}
            </p>
            <p className="voter-election-desc">
              {results?.election?.organization || "Loading..."}
            </p>
          </div>
          <div className="flex justify-center w-full xs:w-auto gap-4 items-center">

            {/* only for dev, will remove later */}
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary' : 'bg-primary'}`}></div>
              <span className="text-sm text-gray">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        {/* kpi section */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full mt-10">
          <KpiCard 
            name="Vote Count" 
            value={results?.overview?.votersWhoVoted || 0} 
            icon={Vote} 
          />
          <KpiCard 
            name="Registered Voters" 
            value={results?.overview?.totalVoters || 0} 
            icon={Users} 
          />
          <KpiCard 
            name="Voter Turnout" 
            value={`${results?.overview?.voterTurnout || 0}%`} 
            icon={BarChart2} 
          />
          <KpiCard 
            name="Voting Ends In" 
            value={timeLeft || "Calculating..."} 
            icon={Clock} 
          />
        </div>
        
        {/* position section */}
        <div className="mt-10 w-full">
          <SectionHeaderContainer>
            Votes Per Position
          </SectionHeaderContainer>
        </div>
        <PositionSection positions={results?.positions} />

        {/* Demographic section */}
        <div className="mt-10 w-full">
          <SectionHeaderContainer>
            Votes Per Demographic (Voter Scope)
          </SectionHeaderContainer>
        </div>
        <DemographicSection demographics={results?.demographics} />
      </div>
    </main>
  );
};

export default LiveDashboard;
