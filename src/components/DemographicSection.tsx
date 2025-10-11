"use client";
import KpiCard from "./KpiCard";
import { MapPinHouse } from "lucide-react";
import { useRouter } from "next/navigation";

// Type definitions for the API demographic data
interface DemographicData {
  id: number;
  name: string;
  votersWhoVoted: number;
  percentage: number;
}

interface DemographicSectionProps {
  demographics?: DemographicData[];
}


// Color schemes for different demographics
const demographicColors = [
  { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200 hover:border-indigo-400' },   // Level 1
  { bg: 'bg-pink-100', hover: 'hover:bg-pink-200 hover:border-pink-400' },         // Level 2
  { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200 hover:border-cyan-400' },         // Level 3
  { bg: 'bg-slate-100', hover: 'hover:bg-slate-200 hover:border-slate-400' },      // Level 4
  { bg: 'bg-rose-100', hover: 'hover:bg-rose-200 hover:border-rose-400' },         // Level 5
  { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200 hover:border-emerald-400' }, // Level 6
  { bg: 'bg-violet-100', hover: 'hover:bg-violet-200 hover:border-violet-400' },   // Level 7
  { bg: 'bg-amber-100', hover: 'hover:bg-amber-200 hover:border-amber-400' },      // Level 8
];

const DemographicSection = ({ demographics }: DemographicSectionProps) => {
  // Use API data if available, otherwise fallback to hardcoded data
  const router = useRouter();

  // If no demographics, show empty state
  if (!demographics || demographics.length === 0) {
    return (
      <div className="text-gray-600 italic text-center py-6 col-span-full">
        No voting scope for this election
      </div>
    );
  }
  
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full">
      {demographics.map((demographic, index) => {
        const colorScheme = demographicColors[index % demographicColors.length];
        return (
          <div 
            key={demographic.id} 
            className={`
              ${colorScheme.bg} 
              rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200
              border-4 border-transparent ${colorScheme.hover.split(' ')[1]} cursor-pointer
            `}
            onClick={() => {
              router.push(`/voter/live-dashboard/voting-scope/${demographic.id}`);
            }}
          >
            <KpiCard
              variant={"demographic"}
              name={demographic.name}
              value={`${demographic.percentage}%`}
              icon={MapPinHouse}
            />
          </div>
        );
      })}
    </section>
  );
};

export default DemographicSection;