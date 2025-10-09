"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLineChart from "@/components/DashboardLineChart";

interface DashboardStats {
  summary: {
    totalVoters: number;
    activeVoters: number;
    ongoingElections: number;
    draftElections: number;
    completedElections: number;
    voterTurnout: number;
  };
  recentElections: Array<{
    name: string;
    status: string;
  }>;
  completedElections: Array<{
    name: string;
    status: string;
  }>;
}

export default function VoterDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/dashboard/stats');
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data.stats);
        } else {
          setError(result.message || 'Failed to load dashboard statistics');
        }
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="main-content flex-auto py-3 overflow-auto pb-3 px-2 md:gap-4 gap-2 py-3 sm:px-5 pt-8">
            <div className="animate-pulse">
              {/* Header skeleton */}
              <div className="mb-6">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-80"></div>
              </div>

              {/* Summary cards skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
                ))}
              </div>

              {/* Chart and side panels layout */}
              <div className="flex flex-col lg:flex-row gap-8 w-full">
                {/* Chart section skeleton */}
                <div className="flex-1 bg-gray-100 rounded-2xl border-2 border-gray-200 min-w-0 w-full p-4">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="w-full h-[180px] bg-gray-200 rounded"></div>
                </div>

                {/* Right side: Recent + Completed elections */}
                <div className="w-full lg:w-80 flex flex-col gap-6 min-w-0">
                  <div className="bg-gray-100 rounded-2xl border-2 border-yellow-200 p-6">
                    <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                      <div className="flex-1 h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                      <div className="flex-1 h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-2xl border-2 border-green-200 p-6">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                        <div className="flex-1 h-4 bg-gray-200 rounded w-32"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Error state
  if (error) {
    return (
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="main-content flex-auto py-3 overflow-auto pb-3 px-2 md:gap-4 gap-2 py-3 sm:px-5">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Generate summary cards with meaningful admin metrics
  const summaryCards = [
    {
      title: "Total Voters",
      value: stats.summary.totalVoters.toLocaleString(),
      change: "",
      sub: "",
      bg: "bg-blue-100",
      text: "text-blue-900",
      changeText: ""
    },
    {
      title: "Active Voters",
      value: stats.summary.activeVoters?.toLocaleString() || "0",
      change: "",
      sub: "",
      bg: "bg-purple-100",
      text: "text-purple-900",
      changeText: ""
    },
    {
      title: "Average Turnout",
      value: `${stats.summary.voterTurnout}%`,
      change: "",
      sub: "",
      bg: "bg-pink-100",
      text: "text-pink-900",
      changeText: ""
    },
    {
      title: "Active Elections",
      value: stats.summary.ongoingElections.toString(),
      change: "",
      sub: "",
      bg: "bg-green-100",
      text: "text-green-900",
      changeText: ""
    },
    {
      title: "Draft Elections",
      value: stats.summary.draftElections.toString(),
      change: "",
      sub: "",
      bg: "bg-yellow-100",
      text: "text-yellow-900",
      changeText: ""
    },
  ];

  // Get recent election with ongoing status
  const recentElection = stats.recentElections.length > 0 ? {
    name: stats.recentElections[0].name,
    status: stats.recentElections[0].status === 'ACTIVE' ? 'Ongoing' : 
            stats.recentElections[0].status === 'CLOSED' ? 'Completed' : 
            stats.recentElections[0].status === 'DRAFT' ? 'Draft' :
            stats.recentElections[0].status,
    color: stats.recentElections[0].status === 'ACTIVE' ? "bg-secondary" : 
           stats.recentElections[0].status === 'CLOSED' ? "bg-green-500" : "bg-gray-500"
  } : {
    name: "No elections yet",
    status: "None",
    color: "bg-gray-400"
  };

  // Get completed elections from API (no need to filter since API provides them directly)
  const completedElections = stats.completedElections
    .slice(0, 3)
    .map(e => ({
      name: e.name,
      status: "Successfully",
      color: "bg-green-500"
    }));

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        {/* Universal App Header */}
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto py-3 overflow-auto pb-3 px-2 md:gap-4 gap-2 py-3 sm:px-5 pt-8">
            <div>
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome back, {session?.user?.name || 'Username'}!
                </h1>
                <p className="text-lg text-gray-600 pl-[2px]">Welcome to Boto Mo 'To — Your Election Companion</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 w-full">
                {summaryCards.map((card, idx) => (
                  <div key={idx} className={`rounded-2xl shadow-sm p-4 ${card.bg} ${card.text} flex flex-col items-start min-w-0 w-full`}>
                    <div className="text-3xl font-bold mb-1">{card.value}</div>
                    <div className="text-base font-semibold mb-2 whitespace-nowrap">{card.title}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${card.changeText}`}>{card.change}</span>
                      <span className="text-xs text-gray-500">{card.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row gap-8 w-full">
                {/* Chart Section */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 border-2 border-gray-200 min-w-0 w-full overflow-visible">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Election Turnout Trends</h2>
                  </div>
                  {/* Line Chart */}
                  <div className="w-full min-h-[180px] flex overflow-x-auto">
                    <DashboardLineChart />
                  </div>
                </div>

                {/* Recent/Completed Elections */}
                <div className="w-full lg:w-80 flex flex-col gap-6 min-w-0">
                  <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-yellow-200">
                    <h3 className="text-base font-semibold mb-3">Recent Election</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-6 h-6 rounded-full ${recentElection.color} flex items-center justify-center text-white font-bold flex-shrink-0`}></span>
                      <span className="font-semibold text-gray-700">{recentElection.name}</span>
                      <span className="text-xs text-gray-500">{recentElection.status}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-green-200">
                    <h3 className="text-base font-semibold mb-3">Completed Elections</h3>
                    <div className="flex flex-col gap-3">
                      {completedElections.map((e, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full ${e.color} flex items-center justify-center text-white font-bold flex-shrink-0`}></span>
                          <span className="font-semibold text-gray-700">{e.name}</span>
                          <span className="text-xs text-gray-500">{e.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}