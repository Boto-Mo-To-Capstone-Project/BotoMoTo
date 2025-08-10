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
      <main className="pt-16 px-8">
        <div className="flex flex-col items-start gap-8">
          <div>
            <p className="superadmin-heading">Hi, Chief Administrator!</p>
            <p className="superadmin-subheading mt-2">
              Loading system performance data...
            </p>
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
    <main className="pt-16 px-8">
      <div className="flex flex-col items-start gap-8">
        <div>
          <p className="superadmin-heading">Hi, Chief Administrator!</p>
          <p className="superadmin-subheading mt-2">
            Welcome back, Chief Administrator! <br />
            You now have access to everything you've missed and full visibility
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
