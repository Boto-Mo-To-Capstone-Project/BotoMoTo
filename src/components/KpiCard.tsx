"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type KpiCardProps = {
  name: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "demographic";
  href?: string;
};

const KpiCard: React.FC<KpiCardProps> = ({
  name,
  value,
  icon: Icon,
  variant = "default",
  href,
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (variant === "demographic" && href) {
      router.push(href);
    }
  };

  return (
    <div
      className={`flex justify-between items-center gap-4 rounded-xl p-4 shadow border border-gray-200 h-32 w-full xs:w-86 
        ${variant === "demographic" ? "cursor-pointer hover:bg-gray-50" : ""}
      `}
      onClick={handleClick}
    >
      <div className="flex flex-col gap-2">
        <span className="kpi-label">{name}</span>
        <span className="kpi-value">{value}</span>
      </div>
      <div className="flex items-center justify-center rounded-full bg-secondary h-20 w-20">
        <Icon className="h-10 w-10 text-primary" />
      </div>
    </div>
  );
};

export default KpiCard;
