"use client";

import React from "react";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type KpiCardProps = {
  name: string;
  value: string | number;
  desc?: string;
  icon: LucideIcon;
  variant?: "default" | "demographic" | "superadmin";
  href?: string;
  trend?: "up" | "down";
  badge?: string;
  color?: "blue" | "purple" | "pink" | "emerald" | "amber" | "red" | "green";
};

const KpiCard: React.FC<KpiCardProps> = ({
  name,
  value,
  desc,
  icon: Icon,
  variant = "default",
  href,
  trend,
  badge,
  color = "blue",
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (variant === "demographic" && href) {
      router.push(href);
    }
  };

  // Color mappings for icon backgrounds and text
  const colorClasses = {
    blue: {
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-600",
      valueBg: "text-blue-700",
      hoverBorder: "hover:border-blue-200",
    },
    purple: {
      iconBg: "bg-purple-100",
      iconText: "text-purple-600",
      badgeBg: "bg-purple-50",
      badgeText: "text-purple-600",
      valueBg: "text-purple-700",
      hoverBorder: "hover:border-purple-200",
    },
    pink: {
      iconBg: "bg-pink-100",
      iconText: "text-pink-600",
      badgeBg: "bg-pink-50",
      badgeText: "text-pink-600",
      valueBg: "text-pink-700",
      hoverBorder: "hover:border-pink-200",
    },
    emerald: {
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-600",
      valueBg: "text-emerald-700",
      hoverBorder: "hover:border-emerald-200",
    },
    amber: {
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-600",
      valueBg: "text-amber-700",
      hoverBorder: "hover:border-amber-200",
    },
    red: {
      iconBg: "bg-red-100",
      iconText: "text-red-600",
      badgeBg: "bg-red-50",
      badgeText: "text-red-600",
      valueBg: "text-red-700",
      hoverBorder: "hover:border-red-200",
    },
    green: {
      iconBg: "bg-green-100",
      iconText: "text-green-600",
      badgeBg: "bg-green-50",
      badgeText: "text-green-600",
      valueBg: "text-green-700",
      hoverBorder: "hover:border-green-200",
    },
  };

  const colors = colorClasses[color];

  // Superadmin variant with trend indicators (original design)
  if (variant === "superadmin") {
    return (
      <div
        className={`flex justify-between items-center gap-4 rounded-xl p-4 shadow border border-gray-200 h-32 w-full  
          ${trend === "up" ? "border-2 border-green-600" : ""}
          ${trend === "down" ? "border-2 border-red-600" : ""}
        `}
        onClick={handleClick}
      >
        <div className="flex flex-col gap-2">
          <span className="kpi-label">{name}</span>
          <span className="kpi-value">{value}</span>
          <div className="flex items-center gap-2">
            <span className={trend === "up" ? "text-green-700" : "text-red-700"}>
              {trend === "up" ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </span>
            <span
              className={`kpi-desc ${
                trend === "up" ? "text-green-700" : "text-red-700"
              }`}
            >
              {desc}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-full bg-secondary h-20 w-20">
          <Icon className="h-10 w-10 text-primary" />
        </div>
      </div>
    );
  }

  // New modern design for default and demographic variants
  return (
    <div
      className={`group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 ${colors.hoverBorder}
        ${variant === "demographic" ? "cursor-pointer" : ""}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${colors.iconText}`} />
        </div>
        {badge && (
          <span className={`text-xs font-semibold ${colors.badgeText} ${colors.badgeBg} px-2.5 py-1 rounded-full`}>
            {badge}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${colors.valueBg} mb-1`}>{value}</p>
      <p className="text-sm text-gray-600 font-medium">{name}</p>
      {desc && <p className="text-xs text-gray-500 mt-1">{desc}</p>}
    </div>
  );
};

export default KpiCard;