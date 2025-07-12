"use client";

type CandidateDashboardCardProps = {
  imgSrc: string;
  name: string;
  party: string;
  votes: number;
  maxVotes: number;
};

const CandidateDashboardCard = ({
  imgSrc,
  name,
  party,
  votes,
  maxVotes,
}: CandidateDashboardCardProps) => {
  const percentage = (votes / maxVotes) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray p-4 ">
      <div className="flex items-center gap-4">
        <img
          src={imgSrc}
          alt={name}
          width={32}
          height={32}
          className="rounded-full object-cover aspect-square"
        />
        <div>
          <h3 className="dshboard-candidate-name">{name}</h3>
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
