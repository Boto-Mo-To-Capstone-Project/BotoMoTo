"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CandidateDashboardCardProps = {
  id: number; // to pass the candidate id
  imgSrc: string;
  name: string;
  party: string;
  partyColor?: string;
  votes: number;
  maxVotes: number;
  highlight?: boolean;
};

const CandidateDashboardCard = ({
  id,
  imgSrc,
  name,
  party,
  partyColor,
  votes,
  maxVotes,
  highlight = false,
}: CandidateDashboardCardProps) => {
  const router = useRouter();
  const percentage = (votes / maxVotes) * 100;
  const [isAdminContext, setIsAdminContext] = useState(false);

  const handleClick = () => {
    router.push(`/voter/live-dashboard/candidate/${id}`);
  };

  // Check if we're in admin context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminContext = sessionStorage.getItem("adminContext") === "true";
      setIsAdminContext(adminContext);
    }
  }, []);
  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg border p-3 ${
        highlight
          ? "border-secondary shadow-lg ring-2 ring-secondary"
          : "border-gray-200"
      } cursor-pointer hover:bg-gray-50 transition-colors`}
    >
      <div className={`flex flex-col ${isAdminContext ? 'xl:flex-row xl:items-start': 'lg:flex-row lg:items-start'} items-center justify-between gap-3`}>
        <div className={`flex flex-col ${isAdminContext ? 'xl:flex-row ':'lg:flex-row '} gap-3 items-center`}>
          <div className="w-24 h-24 flex items-center justify-center rounded-xl border-2 border-gray-200 overflow-hidden">
            <img
              src={imgSrc ? imgSrc : "/assets/placeholderuser.png"}
              alt={name ? `${name} photo` : "Placeholder user"}
              className="w-full h-full object-cover"
              onError={e => {
                if (e.currentTarget.src.indexOf('placeholderuser.png') === -1) {
                  e.currentTarget.src = '/assets/placeholderuser.png';
                }
              }}
                    />
          </div>

          <div className="space-y-4 mt-2">
            <h3 className="font-bold text-md text-gray-900 text-center lg:text-left">{name}</h3>
            {party && (
              <p
                className="px-4 py-1 rounded-full font-semibold text-white text-xs mt-2 lg:mt-0 text-center self-center lg:self-auto"
                style={{
                  backgroundColor: partyColor || "#6B7280", // fallback gray
                }}
              >
                {party}
              </p>
            )}
          </div>

        </div>

        <div className={`mt-4 flex  ${isAdminContext ? 'xl:flex-col xl:items-end xl:gap-2': 'lg:flex-col lg:items-end lg:gap-2'} items-center  gap-4 `}>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${percentage}%` }}
            >-------------------------</div>
          </div>
          <span className="text-xs font-bold whitespace-nowrap">
            {votes} votes
          </span>
        </div>
    </div>
  </div>
  );
};

export default CandidateDashboardCard;
