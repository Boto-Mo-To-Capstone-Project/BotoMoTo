"use client";

import { useRouter } from "next/navigation";

type CandidateDashboardCardProps = {
  id: number; // to pass the candidate id
  imgSrc: string;
  name: string;
  party: string;
  votes: number;
  maxVotes: number;
  highlight?: boolean;
};

const CandidateDashboardCard = ({
  id,
  imgSrc,
  name,
  party,
  votes,
  maxVotes,
  highlight = false,
}: CandidateDashboardCardProps) => {
  const router = useRouter();
  const percentage = (votes / maxVotes) * 100;

  const handleClick = () => {
    router.push(`/voter/live-dashboard/candidate/${id}`);
  };
  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg border p-4 ${
        highlight
          ? "border-secondary shadow-lg ring-2 ring-secondary"
          : "border-gray-200"
      } cursor-pointer hover:bg-gray-50 transition-colors`}
    >
      <div className="flex items-center gap-4">
        <img
          src={imgSrc}
          alt={name}
          width={32}
          height={32}
          className="rounded-full object-cover aspect-square"
        />
        <div>
          <h3 className="dashboard-candidate-name font-semibold">{name}</h3>
          <p className="dashboard-candidate-desc">{party}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="dashboard-candidate-desc whitespace-nowrap">
          {votes} votes
        </span>
      </div>
    </div>
  );
};

export default CandidateDashboardCard;
