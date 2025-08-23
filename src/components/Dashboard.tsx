

import React from "react";
import DashboardLineChart from "@/components/DashboardLineChart";

export default function Dashboard() {
  // Details provided by user
  const summaryCards = [
    {
      title: "Number of Elections",
      value: "890",
      change: "+18%",
      sub: "+3.8k this week",
      bg: "bg-blue-100",
      text: "text-blue-900",
      changeText: "text-green-600"
    },
    {
      title: "Total Voters",
      value: "1,234",
      change: "+18%",
      sub: "+2.8k this week",
      bg: "bg-pink-100",
      text: "text-pink-900",
      changeText: "text-green-600"
    },
    {
      title: "Completed Elections",
      value: "567",
      change: "+18%",
      sub: "+7.8k this week",
      bg: "bg-green-100",
      text: "text-green-900",
      changeText: "text-green-600"
    },
    {
      title: "Ongoing Elections",
      value: "123",
      change: "+18%",
      sub: "+1.2k this week",
      bg: "bg-yellow-100",
      text: "text-yellow-900",
      changeText: "text-red-600"
    },
  ];

  const recentElection = {
    name: "Election 2026",
    status: "Ongoing",
    color: "bg-secondary"
  };

  const completedElections = [
    { name: "Election 2025", status: "Successfully", color: "bg-green-500" },
    { name: "Election 2024", status: "Successfully", color: "bg-green-500" },
    { name: "Election 2023", status: "Successfully", color: "bg-green-500" },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome back, Brian King!</h1>
        <p className="text-lg text-gray-600 pl-[2px]">Welcome to BotoMoTo — Your Election Companion</p>
      </div>

      {/* Summary Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 w-full">
        {summaryCards.map((card, idx) => (
          <div key={idx} className={`rounded-2xl shadow-sm p-4 ${card.bg} ${card.text} flex flex-col items-start min-w-0 w-full`}>
            <div className="text-3xl font-bold mb-1">{card.value}</div>
            <div className="text-base font-semibold mb-2">{card.title}</div>
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
            <h2 className="text-lg font-semibold">Total Voters</h2>
          </div>
          {/* Line Chart */}
  <div className="w-full min-h-[180px] flex items-center justify-center overflow-x-auto">
            <DashboardLineChart />
          </div>
        </div>

        {/* Recent/Completed Elections */}
  <div className="w-full lg:w-80 flex flex-col gap-6 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-yellow-200">
            <h3 className="text-base font-semibold mb-3">Recent Election</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-6 h-6 rounded-full ${recentElection.color} flex items-center justify-center text-white font-bold`}></span>
              <span className="font-semibold text-gray-700">{recentElection.name}</span>
            </div>
            <span className="text-xs text-gray-500">{recentElection.status}</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-green-200">
            <h3 className="text-base font-semibold mb-3">Completed Election</h3>
            <div className="flex flex-col gap-3">
              {completedElections.map((e, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full ${e.color} flex items-center justify-center text-white font-bold`}></span>
                  <span className="font-semibold text-gray-700">{e.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}