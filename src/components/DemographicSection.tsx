"use client";
import KpiCard from "./KpiCard";
import { MapPinHouse } from "lucide-react";

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

// Fallback hardcoded data for when no demographics are provided
const fallbackDemographics = [
  { id: 1, name: "Level 1", percentage: 40 },
  { id: 2, name: "Level 2", percentage: 30 },
  { id: 3, name: "Level 3", percentage: 20 },
  { id: 4, name: "Level 4", percentage: 10 },
];

// Color schemes for different demographics
const demographicColors = [
  { bg: 'bg-indigo-100', hover: 'hover:bg-indigo-200 hover:border-indigo-400' },   // Level 1
  { bg: 'bg-pink-100', hover: 'hover:bg-pink-200 hover:border-pink-400' },         // Level 2
  { bg: 'bg-cyan-100', hover: 'hover:bg-cyan-200 hover:border-cyan-400' },         // Level 3
  { bg: 'bg-yellow-100', hover: 'hover:bg-yellow-200 hover:border-yellow-400' },   // Level 4
  { bg: 'bg-rose-100', hover: 'hover:bg-rose-200 hover:border-rose-400' },         // Level 5
  { bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200 hover:border-emerald-400' }, // Level 6
  { bg: 'bg-violet-100', hover: 'hover:bg-violet-200 hover:border-violet-400' },   // Level 7
  { bg: 'bg-amber-100', hover: 'hover:bg-amber-200 hover:border-amber-400' },      // Level 8
];

const DemographicSection = ({ demographics }: DemographicSectionProps) => {
  // Use API data if available, otherwise fallback to hardcoded data
  const displayDemographics = demographics && demographics.length > 0 ? demographics : fallbackDemographics;
  
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full">
      {displayDemographics.map((demographic, index) => {
        const colorScheme = demographicColors[index % demographicColors.length];
        return (
          <div 
            key={demographic.id} 
            className={`
              ${colorScheme.bg} 
              rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200
              border-4 border-transparent ${colorScheme.hover.split(' ')[1]} cursor-pointer
            `}
          >
            <KpiCard
              variant={"demographic"}
              name={demographic.name}
              value={`${demographic.percentage}%`}
              icon={MapPinHouse}
              href={`/voter/live-dashboard/voting-scope/${demographic.id}`}
            />
          </div>
        );
      })}
    </section>
  );
};

export default DemographicSection;