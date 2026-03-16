"use client";

import { useState } from "react";
import KpiCard from "@/components/KpiCard";
import {
  Activity,
  Ban,
  CloudCheck,
  Clock3,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  useSystemPerformance,
  formatKpiValue,
  getTrendDirection,
  formatTrendDescription,
} from "@/hooks/useSystemPerformance";

type TimeRange = "24h" | "7d" | "30d";

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

const formatDateRange = (dateFrom?: string, dateTo?: string) => {
  if (!dateFrom || !dateTo) return "Date range unavailable";

  const start = new Date(dateFrom);
  const end = new Date(dateTo);

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

const getSafeTrendDirection = (trend?: number, invert = false) => {
  if (trend === undefined || trend === null) return undefined;
  return getTrendDirection(invert ? -trend : trend);
};

export default function SuperadminDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const { data, loading, error, refetch } = useSystemPerformance(timeRange);
  const generatedAtLabel = data?.metadata?.generatedAt
    ? new Date(data.metadata.generatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sync pending";

  const metrics = data?.overview
    ? [
        {
          name: "System Uptime",
          value: formatKpiValue(data.overview.systemUptime, "percentage"),
          icon: CloudCheck,
          desc: formatTrendDescription(data.overview.systemUptime?.trend, timeRange),
          trend: getSafeTrendDirection(data.overview.systemUptime?.trend),
        },
        {
          name: "Error Rate",
          value: formatKpiValue(data.overview.errorRate, "percentage"),
          icon: Ban,
          desc: formatTrendDescription(data.overview.errorRate?.trend, timeRange),
          // Lower error rate is better, so trend is inverted.
          trend: getSafeTrendDirection(data.overview.errorRate?.trend, true),
        },
        {
          name: "Avg Response Time",
          value: formatKpiValue(data.overview.averageResponseTime, "time"),
          icon: Clock3,
          desc: formatTrendDescription(data.overview.averageResponseTime?.trend, timeRange),
          // Lower response time is better, so trend is inverted.
          trend: getSafeTrendDirection(data.overview.averageResponseTime?.trend, true),
        },
        {
          name: "Peak Concurrent Users",
          value: formatKpiValue(data.overview.peakConcurrentUsers, "number"),
          icon: Users,
          desc: formatTrendDescription(data.overview.peakConcurrentUsers?.trend, timeRange),
          trend: getSafeTrendDirection(data.overview.peakConcurrentUsers?.trend),
        },
        {
          name: "Vote Success Rate",
          value: formatKpiValue(data.overview.voteSubmissionSuccessRate, "percentage"),
          icon: TrendingUp,
          desc: formatTrendDescription(data.overview.voteSubmissionSuccessRate?.trend, timeRange),
          trend: getSafeTrendDirection(data.overview.voteSubmissionSuccessRate?.trend),
        },
      ]
    : [];

  // Loading state
  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6 md:px-8 md:py-8 animate-pulse">
        <div className="w-full space-y-6">
          <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary via-red-800 to-red-900 p-6 md:p-8">
            <div className="h-4 w-36 rounded-full bg-white/30"></div>
            <div className="mt-4 h-10 w-72 rounded-xl bg-white/25"></div>
            <div className="mt-3 h-4 w-full max-w-2xl rounded bg-white/20"></div>
            <div className="mt-2 h-4 w-full max-w-xl rounded bg-white/20"></div>
            <div className="mt-5 flex gap-2">
              <div className="h-8 w-28 rounded-full bg-white/25"></div>
              <div className="h-8 w-36 rounded-full bg-white/25"></div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
            <div className="mb-6 h-6 w-64 rounded bg-gray-200"></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 rounded-2xl border border-gray-200 bg-gray-50"
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6 md:px-8 md:py-8">
        <div className="w-full">
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm md:p-8">
            <p className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
              Dashboard Issue
            </p>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
              Unable to load system performance data
            </h1>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              {error}
            </p>
            <button
              onClick={refetch}
              className="mt-6 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Retry Fetch
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6 md:px-8 md:py-8">
      <div className="w-full space-y-6">
        <section className="relative overflow-hidden rounded-2xl shadow-lg text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7b1c1c] via-[#992b2b] to-[#5c0000]"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

          <div className="relative px-5 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  Super Admin Command Center
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight md:text-4xl">
                  Hi, Chief Administrator!
                </h1>
                <p className="mt-3 text-sm text-white/85 md:text-base">
                  Welcome back. Your core system indicators are live, so you can monitor platform health and response quality at a glance.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
                    <Activity className="h-3.5 w-3.5" />
                    {TIME_RANGE_LABELS[timeRange]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
                    <Clock3 className="h-3.5 w-3.5" />
                    {generatedAtLabel}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-black/15 p-2 backdrop-blur-sm">
                <div className="flex flex-wrap gap-2">
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimeRange(option.value)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        timeRange === option.value
                          ? "bg-white text-primary shadow-sm"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                      aria-pressed={timeRange === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 text-xs text-white/70">
              Coverage: {formatDateRange(data?.metadata?.dateFrom, data?.metadata?.dateTo)}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
                Performance Overview
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                System Performance KPIs
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Real-time indicators of uptime, reliability, and load behavior.
              </p>
            </div>
            <button
              onClick={refetch}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <KpiCard
                key={metric.name}
                name={metric.name}
                value={metric.value}
                icon={metric.icon}
                variant="superadmin"
                desc={metric.desc}
                trend={metric.trend}
              />
            ))}
          </div>

          {metrics.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              No KPI data is available for this period yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
