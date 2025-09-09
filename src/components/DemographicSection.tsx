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

const DemographicSection = ({ demographics }: DemographicSectionProps) => {
  // Use API data if available, otherwise fallback to hardcoded data
  const displayDemographics = demographics && demographics.length > 0 ? demographics : fallbackDemographics;
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full">
      {displayDemographics.map((demographic) => (
        <KpiCard
          key={demographic.id}
          variant={"demographic"}
          name={demographic.name}
          value={`${demographic.percentage}%`}
          icon={MapPinHouse}
          href={`/voter/live-dashboard/voting-scope/${demographic.id}`}
        />
      ))}
    </section>
  );
};

export default DemographicSection;
