"use client";

import { useState } from "react";
import KpiCard from "@/components/KpiCard";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { Ban, CloudCheck, Clock, Users, TrendingUp } from "lucide-react";
import { 
  useSystemPerformance, 
  formatKpiValue, 
  getTrendDirection, 
  formatTrendDescription 
} from "@/hooks/useSystemPerformance";
  
export default function SuperadminDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const { data, loading, error, refetch } = useSystemPerformance(timeRange);

  // Loading state
  if (loading) {
    return (
      <main className="pt-8 px-8 animate-pulse">
        <div className="flex flex-col items-start gap-8">
          <div>
            <p className="text-xl md:text-3xl font-bold mb-1 bg-gray-200 h-8 w-64 rounded"></p>
            <p className="text-sm font-bold text-gray-600 pl-[2px] bg-gray-200 h-12 w-full max-w-2xl rounded mt-2"></p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 mb-4">
            <div className="h-10 w-16 bg-gray-200 rounded"></div>
            <div className="h-10 w-16 bg-gray-200 rounded"></div>
            <div className="h-10 w-16 bg-gray-200 rounded"></div>
          </div>

          {/* System Performance KPIs */}
          <div className="w-full">
            <div className="mb-6 bg-gray-200 h-7 w-64 rounded"></div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {/* Simulate KPI cards */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg"></div>
                    <div className="bg-gray-50 px-2.5 py-1 rounded-full w-20"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-9 bg-gray-100 rounded w-24"></div>
                    <div className="h-5 bg-gray-100 rounded w-32"></div>
                    <div className="h-4 bg-gray-50 rounded w-40"></div>
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
      <main className="pt-16 px-8">
        <div className="flex flex-col items-start gap-8">
          <div>
            <p className="superadmin-heading">Hi, Chief Administrator!</p>
            <p className="superadmin-subheading mt-2 text-red-600">
              Error loading performance data: {error}
            </p>
            <button 
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-8 px-8">
      <div className="flex flex-col items-start gap-8">
        <div>
          <p className="text-xl md:text-3xl font-bold mb-1">Hi, Chief Administrator!</p>
          <p className="text-sm font-bold text-gray-600 pl-[2px]">
            Welcome back, Chief Administrator! You now have access to everything you've missed and full visibility
            of your database.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-4 py-2 rounded ${timeRange === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded ${timeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded ${timeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            30d
          </button>
        </div>

        {/* System Performance KPIs */}
        <div className="w-full">
          <SectionHeaderContainer>System Performance KPIs</SectionHeaderContainer>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {data?.overview && (
              <>
                <KpiCard
                  name="System Uptime"
                  value={formatKpiValue(data.overview.systemUptime, 'percentage')}
                  icon={CloudCheck}
                  variant="superadmin"
                  desc={formatTrendDescription(data.overview.systemUptime?.trend, timeRange)}
                  trend={getTrendDirection(data.overview.systemUptime?.trend)}
                />
                <KpiCard
                  name="Error Rate"
                  value={formatKpiValue(data.overview.errorRate, 'percentage')}
                  icon={Ban}
                  variant="superadmin"
                  desc={formatTrendDescription(data.overview.errorRate?.trend, timeRange)}
                  trend={getTrendDirection(data.overview.errorRate?.trend ? -data.overview.errorRate.trend : undefined)} // Inverted: lower error rate is better
                />
                <KpiCard
                  name="Avg Response Time"
                  value={formatKpiValue(data.overview.averageResponseTime, 'time')}
                  icon={Clock}
                  variant="superadmin"
                  desc={formatTrendDescription(data.overview.averageResponseTime?.trend, timeRange)}
                  trend={getTrendDirection(data.overview.averageResponseTime?.trend ? -data.overview.averageResponseTime.trend : undefined)} // Inverted: lower time is better
                />
                <KpiCard
                  name="Peak Concurrent Users"
                  value={formatKpiValue(data.overview.peakConcurrentUsers, 'number')}
                  icon={Users}
                  variant="superadmin"
                  desc={formatTrendDescription(data.overview.peakConcurrentUsers?.trend, timeRange)}
                  trend={getTrendDirection(data.overview.peakConcurrentUsers?.trend)}
                />
                <KpiCard
                  name="Vote Success Rate"
                  value={formatKpiValue(data.overview.voteSubmissionSuccessRate, 'percentage')}
                  icon={TrendingUp}
                  variant="superadmin"
                  desc={formatTrendDescription(data.overview.voteSubmissionSuccessRate?.trend, timeRange)}
                  trend={getTrendDirection(data.overview.voteSubmissionSuccessRate?.trend)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
