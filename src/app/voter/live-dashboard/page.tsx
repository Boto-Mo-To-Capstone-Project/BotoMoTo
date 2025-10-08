"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Vote, Users, BarChart2, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";
import DemographicSection from "@/components/DemographicSection";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { SubmitButton } from "@/components/SubmitButton";
import toast from "react-hot-toast";

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
  const router = useRouter();
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isAdminContext, setIsAdminContext] = useState(false);
  const [isSuperAdminContext, setIsSuperAdminContext] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isVoterContext, setIsVoterContext] = useState(false);
  
  // Check if we're in admin context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminContext = sessionStorage.getItem("adminContext") === "true";
      setIsAdminContext(adminContext);
      const superAdminContext = sessionStorage.getItem("superAdminContext") === "true";
      setIsSuperAdminContext(superAdminContext);
    }
  }, []);

  // Get election ID from admin context only (no localStorage dependency)
  const getElectionIdFromAdmin = (): number | null => {
    try {
      // Only check admin context - no localStorage fallback for security
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

  // Get election ID from voter session (async version)
  const getElectionIdFromSession = async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/voter/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.voter?.election?.id) {
          console.log("✅ Got election ID from session:", data.voter.election.id);
          setIsVoterContext(true); // Mark as voter context
          return data.voter.election.id;
        }
      }
    } catch (e) {
      console.log("No voter session found");
    }
    return null;
  };

  // Logout function for voters
  const handleVoterLogout = async () => {
    try {
      await fetch("/api/voter/logout", { method: "POST" });
      toast.success("Logged out successfully!");
    } catch (e) {
      console.error("Error logging out:", e);
    } finally {
      // Clear cookie client-side as backup
      document.cookie = "voter_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // Clear localStorage and redirect
      localStorage.removeItem("voterData");
      localStorage.removeItem("mfaFlow");
      router.push("/voter/login");
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
            setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')} hrs`);
          } else {
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')} mins`);
          }
        } else {
          setTimeLeft("Ended");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [results?.election?.schedule?.dateFinish]);

  // PDF Export function - Now calls API endpoint
  const exportToPDF = async () => {
    if (!results) {
      toast.error("No election data available for export.");
      return;
    }

    // First try to get election ID from session (secure method)
    let electionId = await getElectionIdFromSession();
    
    // If no voter session, check if admin context exists  
    if (!electionId) {
      electionId = getElectionIdFromAdmin();
    }
    
    if (!electionId) {
      toast.error("Unable to determine election ID for export.");
      return;
    }

    setIsExporting(true);

    try {
      console.log('📊 Starting PDF export via API...');

      const response = await fetch(`/api/elections/${electionId}/export-pdf`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the PDF blob from response
      const blob = await response.blob();
      
      // Generate filename with election name and timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
      const electionName = results.election.name || 'Election_Results';
      const filename = `${electionName.replace(/[^a-zA-Z0-9]/g, '_')}_Results_${timestamp}.pdf`;

      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ PDF exported successfully via API');
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      
      // Show user-friendly error messages
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('403') || message.includes('permission')) {
        toast.error('Only administrators can export election results.');
      } else if (message.includes('400') && message.includes('closed')) {
        toast.error('Only closed elections can be exported.');
      } else if (message.includes('400') && message.includes('votes')) {
        toast.error('Cannot export election with no votes.');
      } else {
        toast.error(`Failed to export PDF: ${message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Initialize data fetching and SSE connection
  useEffect(() => {
    const initializeDashboard = async () => {
      // First try to get election ID from session (secure method)
      let electionId = await getElectionIdFromSession();
      
      // If no voter session, check if admin context exists
      if (!electionId) {
        electionId = getElectionIdFromAdmin();
      }
      
      if (electionId) {
        console.log(`🚀 Initializing live dashboard for election ${electionId}`);
        
        // First fetch initial data
        fetchInitialResults(electionId);
        
        // Then connect to real-time stream
        const cleanup = connectToSSE(electionId);
        
        // Cleanup on unmount
        return cleanup;
      } else {
        setError("Access denied. This page requires an active voter session or admin privileges.");
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Loading state
  if (loading) {
    return (
      <main
        className={`flex flex-col items-center gap-6 pb-20 ${
          isAdminContext || isSuperAdminContext ? "pt-0" : "pt-20"
        } text-justify px-5 sm:px-10`}
      >
        <div
          className="w-full max-w-7xl flex flex-col items-center animate-pulse"
          id="pdf-export-content"
        >
          {/* Live Dashboard Status */}
          <div
            className={`flex flex-col xs:flex-row xs:items-center xs:justify-between w-full mb-4 gap-2 sticky ${
              isAdminContext || isSuperAdminContext
                ? "top-16 pt-8"
                : "top-20 pt-10"
            } bg-white z-50 py-2 px-3`}
          >
            {/* Left - Status indicator */}
            <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg w-[220px]">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <div className="h-5 bg-gray-200 rounded w-28"></div>
            </div>

            {/* Right - Buttons */}
            <div className="flex items-center gap-3 justify-end">
              <div className="h-10 bg-gray-200 rounded-md w-[100px]"></div>
              <div className="h-10 bg-gray-200 rounded-md w-[100px]"></div>
            </div>
          </div>

          {/* Red Header Card */}
          <div className="flex items-center rounded-2xl bg-gray-100 px-6 py-4 relative overflow-hidden w-full mb-4">
            <div className="space-y-2 w-full">
              <div className="h-5 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
          </div>

          {/* KPI Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full mb-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-100 h-28 p-4 flex flex-col justify-center"
              >
                <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-7 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
            {/* Left - Votes Per Position */}
            <div className="w-full">
              <div className="bg-maroon-800 rounded-t-2xl p-3 mb-3">
                <div className="h-5 bg-gray-300/40 rounded w-3/4"></div>
              </div>
              <div className="bg-white border border-gray-200 rounded-b-2xl p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>

            {/* Right - Votes Per Demographic */}
            <div className="w-full">
              <div className="bg-maroon-800 rounded-t-2xl p-3 mb-3">
                <div className="h-5 bg-gray-300/40 rounded w-3/4"></div>
              </div>
              <div className="bg-white border border-gray-200 rounded-b-2xl p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className={`flex flex-col items-center gap-10 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-8' : 'pt-40'} text-justify px-10`}>
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
    <main className={`flex flex-col items-center gap-6 pb-20 ${(isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'} text-justify px-5 sm:px-20`}>
      <div className="w-full flex flex-col items-center" id="pdf-export-content">
        {/* Live Dashboard Status - Below Header, Left Aligned */}
        <div className={`flex flex-col xs:flex-row xs:items-center xs:justify-between w-full mb-4 gap-2 sticky ${(isAdminContext || isSuperAdminContext) ? 'top-16 pt-8' : 'top-20 pt-10'} bg-white z-50 py-2 px-3`}>
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span className={`text-lg font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Live Dashboard' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-3 no-print justify-end">
            {/* Show logout button only for voters, not admin context */}
            {isVoterContext && (
              <SubmitButton
                variant="action"
                onClick={handleVoterLogout}
                label="Logout"
                />
            )}
            {isAdminContext && (
              <SubmitButton
                variant="action-primary"
                label={isExporting ? "Exporting" : "Export"}
                onClick={exportToPDF}
                isLoading={isExporting}
              />
            )}
          </div>
        </div>

        {/* Red Header Card - Full Width */}
        <div className="flex items-center rounded-2xl bg-red-800 px-6 py-4 relative overflow-hidden w-full mb-4">
          <div>
            <h2 className="text-white text-xl font-semibold mb-1">
              {results?.election?.name || "Loading Election..."}
            </h2>
            <p className="text-white text-sm">
              {results?.election?.organization || "Loading Organization..."}
            </p>
          </div>
        </div>

        {/* KPI Section - Better Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 w-full mb-6">
          <div className="bg-blue-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Votes" 
              value={results?.overview?.votersWhoVoted || 0} 
              icon={Vote}
            />
          </div>
          <div className="bg-green-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Voters" 
              value={results?.overview?.totalVoters || 0} 
              icon={Users}
            />
          </div>
          <div className="bg-purple-100 rounded-lg overflow-hidden">
            <KpiCard 
              name="Turnout" 
              value={`${results?.overview?.voterTurnout || 0}%`} 
              icon={BarChart2}
            />
          </div>
          <div className="bg-orange-100 rounded-lg overflow-hidden whitespace-nowrap">
            <KpiCard 
              name="Ending in" 
              value={timeLeft || "Calculating..."} 
              icon={Clock}
            />
          </div>
        </div>
        
        {/* Two Column Layout for Positions and Demographics */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
          {/* Position section - Left Column */}
          <div className="w-full">
            <SectionHeaderContainer variant="maroon">
              <span className="text-white">Votes Per Position (Voter Scope)</span>
            </SectionHeaderContainer>
            <PositionSection positions={results?.positions} />
          </div>

          {/* Demographic section - Right Column */}
          <div className="w-full">
            <SectionHeaderContainer variant="maroon">
              <span className="text-white">Votes Per Demographic (Voter Scope)</span>
            </SectionHeaderContainer>
            <DemographicSection demographics={results?.demographics} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default LiveDashboard;