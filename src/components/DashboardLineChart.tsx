"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

import type { ApexOptions } from "apexcharts";

interface ChartData {
  categories: number[];
  series: Array<{
    name: string;
    data: (number | null)[];
  }>;
}

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

  // Fallback to hardcoded data if no real data available
  const fallbackSeries = [
    {
      name: "Sample Election 2025",
      data: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340],
    },
    {
      name: "Sample Election 2024", 
      data: [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320],
    },
    {
      name: "Sample Election 2023",
      data: [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
    },
  ];

  const fallbackCategories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Use real data if available and has data, otherwise use fallback
  const hasRealData = chartData?.series && chartData.series.length > 0 && chartData.categories.length > 0;
  const displaySeries = hasRealData ? chartData.series : fallbackSeries;
  const displayCategories = hasRealData ? chartData.categories.map(year => year.toString()) : fallbackCategories;

  const chartOptions: ApexOptions = {
    chart: {
      type: "line",
      height: 240,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    colors: ["#8B0000", "#B8860B", "#A9A9A9", "#4CAF50", "#FF9800", "#9C27B0"], // More colors for multiple templates
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
        text: hasRealData ? "Election Year" : "Month",
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
        text: hasRealData ? "Voter Turnout (%)" : "Sample Data",
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
      padding: { top: 5, right: 20 },
    },
    fill: { opacity: 0.8 },
    tooltip: { 
      theme: "dark",
      y: {
        formatter: (value) => {
          if (value === null) return "No data";
          return hasRealData ? `${value}%` : `${value} votes`;
        }
      }
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      markers: {},
      fontSize: "14px",
      fontWeight: 500,
    },
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
      <div className="flex items-center justify-center h-60">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }

  return (
    <Chart
      options={chartOptions}
      series={displaySeries}
      type="line"
      height={240}
      width={800}
    />
  );
}
