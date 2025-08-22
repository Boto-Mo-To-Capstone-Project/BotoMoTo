"use client";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

import type { ApexOptions } from "apexcharts";

const chartOptions: ApexOptions = {
    chart: {
        type: "line",
        height: 240,
        toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    colors: ["#8B0000", "#B8860B", "#A9A9A9"],
    stroke: { lineCap: "round", curve: "smooth" },
    markers: { size: 0 },
    xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
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
    },
    grid: {
        show: true,
        borderColor: "#dddddd",
        strokeDashArray: 5,
        xaxis: { lines: { show: true } },
        padding: { top: 5, right: 20 },
    },
    fill: { opacity: 0.8 },
    tooltip: { theme: "dark" },
    legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        markers: {},
        fontSize: "14px",
        fontWeight: 500,
        labels: {
            colors: ["#8B0000", "#B8860B", "#A9A9A9"],
        },
    },
};

const chartSeries = [
    {
        name: "2025",
        data: [120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340],
    },
    {
        name: "2024",
        data: [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320],
    },
    {
        name: "2023",
        data: [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300],
    },
];

export default function DashboardLineChart() {
    return (
        <Chart
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={240}
            width={800}
        />
    );
}
