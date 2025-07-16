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
  trend?: "up" | "down"; // Only allow up or down trends
};

const KpiCard: React.FC<KpiCardProps> = ({
  name,
  value,
  desc,
  icon: Icon,
  variant = "default",
  href,
  trend,
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (variant === "demographic" && href) {
      router.push(href);
    }
  };

  return (
    <div
      className={`flex justify-between items-center gap-4 rounded-xl p-4 shadow border border-gray-200 h-32 w-full  
        ${variant === "demographic" ? "cursor-pointer hover:bg-gray-50" : ""}
        ${
          variant === "superadmin" && trend === "up"
            ? "border-2 border-green-600"
            : ""
        }
        ${
          variant === "superadmin" && trend === "down"
            ? "border-2 border-red-600"
            : ""
        }
      `}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-2">
        <span className="kpi-label">{name}</span>
        <span className="kpi-value">{value}</span>
        {variant === "superadmin" && (
          <div className="flex items-center gap-2">
            <span
              className={trend === "up" ? "text-green-700" : "text-red-700"}
            >
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
        )}
      </div>
      <div className="flex items-center justify-center rounded-full bg-secondary h-20 w-20">
        <Icon className="h-10 w-10 text-primary" />
      </div>
    </div>
  );
};

export default KpiCard;
