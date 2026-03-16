"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HiChartBar } from "react-icons/hi2";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

import type { ApexOptions } from "apexcharts";

interface ChartData {
  categories: number[];
  series: Array<{
    name: string;
    data: (number | null)[];
  }>;
}

const CHART_HEIGHT = 300;

export default function DashboardLineChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/chart-data');
        const result = await response.json();
        if (result.success) {
          setChartData(result.data.chartData);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  // Check if we have real data
  const hasRealData = chartData?.series && chartData.series.length > 0 && chartData.categories.length > 0;
  
  // If no real data available, show message instead of chart
  if (!loading && !hasRealData) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center px-4">
          <HiChartBar className="text-gray-400 text-5xl mb-3 mx-auto" />
          <div className="text-gray-600 text-sm text-lg mb-2">No Election Data Available</div>
          <div className="text-gray-600 text-sm">
            Create repeating elections to see turnout trends
          </div>
        </div>
      </div>
    );
  }

  const displaySeries = chartData?.series || [];
  const displayCategories = chartData?.categories.map(year => year.toString()) || [];

  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
      height: CHART_HEIGHT,
      toolbar: { show: false },
      redrawOnWindowResize: true,
      redrawOnParentResize: true,
      parentHeightOffset: 0,
    },
    dataLabels: { enabled: true },
    // Color palette for election lines - vibrant and distinct colors
    colors: [
      "#DC2626", // Bright Red - 1st election
      "#F59E0B", // Amber/Orange - 2nd election  
      "#3B82F6", // Blue - 3rd election (replaced grey)
      "#10B981", // Emerald Green - 4th election
      "#8B5CF6", // Purple - 5th election
      "#F97316"  // Orange - 6th election
    ],
    stroke: { lineCap: "round", curve: "smooth" },
    markers: { size: 0 },
    xaxis: {
      categories: displayCategories,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        style: {
          colors: "#616161",
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 400,
        },
      },
      title: {
        text: "Election Year",
        style: {
          fontSize: "12px",
          color: "#616161"
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: "#616161",
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 400,
        },
      },
      title: {
        text: "Voter Turnout (%)",
        style: {
          fontSize: "12px",
          color: "#616161"
        }
      }
    },
    grid: {
      show: true,
      borderColor: "#dddddd",
      strokeDashArray: 5,
      xaxis: { lines: { show: true } },
      padding: { top: 8, right: 12, left: 8, bottom: 0 },
    },
    fill: { opacity: 0.8 },
    tooltip: { 
      theme: "dark",
      y: {
        formatter: (value) => {
          if (value === null) return "No data";
          return `${value}%`;
        }
      }
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      markers: {},
      fontSize: "14px",
      fontWeight: 500,
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          legend: {
            fontSize: "12px",
          },
        },
      },
    ],
    noData: {
      text: loading ? "Loading chart data..." : "No election data available",
      align: 'center',
      verticalAlign: 'middle',
      style: {
        color: "#616161",
        fontSize: "14px"
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px] w-full">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  return (
    <Chart
      options={chartOptions}
      series={displaySeries}
      type="line"
      height={CHART_HEIGHT}
      width="100%"
    />
  );
}
