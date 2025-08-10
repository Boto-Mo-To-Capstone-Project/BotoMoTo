import { useState, useEffect } from 'react';

interface KpiMetric {
  value: number;
  trend: number;
  sparklineData: number[];
}

interface SystemPerformanceKpis {
  systemUptime: KpiMetric;
  averageResponseTime: KpiMetric;
  peakConcurrentUsers: KpiMetric;
  errorRate: KpiMetric;
  voteSubmissionSuccessRate: KpiMetric;
}

interface SystemPerformanceData {
  overview: SystemPerformanceKpis;
  metadata: {
    timeRange: string;
    dateFrom: string;
    dateTo: string;
    generatedAt: string;
  };
}

interface UseSystemPerformanceReturn {
  data: SystemPerformanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch system performance KPIs for superadmin dashboard
 */
export function useSystemPerformance(timeRange: string = '24h'): UseSystemPerformanceReturn {
  const [data, setData] = useState<SystemPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/analytics/system-performance?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies
      });

      const result = await response.json();

      console.log('API Response:', result); // Debug log

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch system performance data');
      }

      if (result.success && result.data) {
        console.log('Setting data:', result.data); // Debug log
        setData(result.data);
      } else {
        throw new Error(result.message || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching system performance data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Helper function to format KPI values for display
 */
export function formatKpiValue(metric: KpiMetric | undefined, type: 'percentage' | 'number' | 'time'): string {
  if (!metric || metric.value === undefined || metric.value === null) {
    return 'N/A';
  }

  switch (type) {
    case 'percentage':
      return `${metric.value.toFixed(1)}%`;
    case 'time':
      return `${Math.round(metric.value)}ms`;
    case 'number':
    default:
      return metric.value.toString();
  }
}

/**
 * Helper function to get trend direction for KpiCard
 */
export function getTrendDirection(trend: number | undefined): 'up' | 'down' {
  if (trend === undefined || trend === null) {
    return 'up'; // Default fallback
  }
  return trend >= 0 ? 'up' : 'down';
}

/**
 * Helper function to format trend description
 */
export function formatTrendDescription(trend: number | undefined, timeRange: string): string {
  if (trend === undefined || trend === null) {
    return 'No trend data available';
  }
  
  const period = timeRange === '24h' ? 'yesterday' : timeRange === '7d' ? 'last week' : 'last month';
  const direction = trend >= 0 ? 'increase' : 'decrease';
  return `${Math.abs(trend).toFixed(1)}% ${direction} vs ${period}`;
}
