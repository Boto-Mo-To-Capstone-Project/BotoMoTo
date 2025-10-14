"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vote, Users, BarChart2, Clock, TrendingUp, Activity } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";
import DemographicSection from "@/components/DemographicSection";
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
    instanceName?: string | null;
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
          setIsVoterContext(true);
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
      document.cookie = "voter_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
      eventSource.close();
      
      setTimeout(() => {
        fetchInitialResults(electionId);
        connectToSSE(electionId);
      }, 5000);
    };

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

  // PDF Export function
  const exportToPDF = async () => {
    if (!results) {
      toast.error("No election data available for export.");
      return;
    }

    let electionId = await getElectionIdFromSession();
    
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

      const blob = await response.blob();
      
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
      const baseName = results.election.name || 'Election_Results';
      const electionName = results.election.instanceName 
        ? `${baseName}_${results.election.instanceName}`
        : baseName;
      const filename = `${electionName.replace(/[^a-zA-Z0-9_]/g, '_')}_Results_${timestamp}.pdf`;

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
      let electionId = await getElectionIdFromSession();
      
      if (!electionId) {
        electionId = getElectionIdFromAdmin();
      }
      
      if (electionId) {
        console.log(`🚀 Initializing live dashboard for election ${electionId}`);
        fetchInitialResults(electionId);
        const cleanup = connectToSSE(electionId);
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
      <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
        isAdminContext || isSuperAdminContext ? "pt-0" : "pt-20"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className={`sticky ${
              isAdminContext || isSuperAdminContext ? "top-16" : "top-20"
            } bg-white z-50 py-3 px-5`}>
              <div className="flex justify-between items-center">
                <div className="h-10 bg-gray-200 rounded-lg w-48"></div>
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#7b1c1c] to-[#5c0000] rounded-2xl p-8 shadow-lg">
              <div className="h-8 bg-white/20 rounded w-96 mb-3"></div>
              <div className="h-5 bg-white/20 rounded w-64"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 h-32">
                  <div className="h-12 bg-gray-200 rounded-lg mb-3"></div>
                  <div className="h-8 bg-gray-300 rounded w-20"></div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-200 h-14"></div>
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-6 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center ${
        (isAdminContext || isSuperAdminContext) ? 'pt-16' : 'pt-20'
      }`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Election Results</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  // Main render with real data
  return (
    <main className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${
      (isAdminContext || isSuperAdminContext) ? 'pt-0' : 'pt-20'
    }`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-6" id="pdf-export-content">
        {/* Live Status Bar - Clean Toolbar */}
        <div className={`sticky ${
          (isAdminContext || isSuperAdminContext) ? 'top-16' : 'top-20'
        } z-50 bg-white flex items-center justify-between gap-3 py-3 px-4 mb-4 transition-all duration-300`}>
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3 no-print">
            {isVoterContext && !isAdminContext && !isSuperAdminContext && (
              <button
                onClick={handleVoterLogout}
                className="px-4 py-2 text-sm font-semibold text-[#7b1c1c] border border-[#7b1c1c] rounded-lg hover:bg-[#7b1c1c] hover:text-white transition-colors"
              >
                Logout
              </button>
            )}
            {(isAdminContext || isSuperAdminContext) && (
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#7b1c1c] hover:bg-[#5c0000] rounded-lg border border-[#5c0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            )}
          </div>
        </div>

        {/* Election Header - Professional Gradient */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-md font-bold text-white mb-1">
                  {results?.election?.name && results?.election?.instanceName 
                    ? `${results.election.name} - ${results.election.instanceName}`
                    : results?.election?.name || "Loading Election..."
                  }
                </h1>
                <p className="text-white/90 text-sm font-medium">
                  {results?.election?.organization || "Loading Organization..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards - Modern Design with Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            name="Total Votes"
            value={results?.overview?.votersWhoVoted || 0}
            icon={Vote}
            variant="default"
            badge="CAST"
            color="blue"
          />
          
          <KpiCard
            name="Registered Voters"
            value={results?.overview?.totalVoters || 0}
            icon={Users}
            variant="default"
            badge="TOTAL"
            color="purple"
          />
          
          <KpiCard
            name="Voter Turnout"
            value={`${results?.overview?.voterTurnout || 0}%`}
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
        
        {/* Results Grid - Professional Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Position Results */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="bg-gradient-to-r from-[#7b1c1c] to-[#5c0000] px-4 py-3">
              <h2 className="text-white text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Votes Per Position
              </h2>
              <p className="text-white/80 text-xs mt-1">Voter Position Analysis</p>
            </div>
            <div className="p-6">
              <PositionSection positions={results?.positions} />
            </div>
          </div>

          {/* Demographic Results */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="bg-gradient-to-r from-[#7b1c1c] to-[#5c0000] px-6 py-4">
              <h2 className="text-white text-sm font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Votes Per Demographic (Voter Scope)
              </h2>
              <p className="text-white/80 text-xs mt-1">Click on scope cards to view detailed breakdown</p>
            </div>
            <div className="p-6">
              <DemographicSection demographics={results?.demographics} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LiveDashboard;