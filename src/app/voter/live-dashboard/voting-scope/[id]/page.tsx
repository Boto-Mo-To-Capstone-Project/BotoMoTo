"use client";

import { Vote, Users, BarChart2, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import PositionSection from "@/components/PositionSection";

const DemographicDashboard = () => {
  return (
    <main className="flex flex-col items-center gap-10 pb-20 pt-40 text-justify px-10">
      <div className="w-4/5 flex flex-col items-center ">
        {/* page head and export btn */}
        <div className="flex flex-col items-center gap-10 justify-between xl:flex-row w-full">
          <div className="text-center xl:text-start space-y-2 ">
            <p className="voter-election-heading">
              2025 Election of Provident (Department 1)
            </p>
            <p className="voter-election-desc">
              Polytechnic University of the Philippines (PUP) Provident Fund
            </p>
          </div>
          {/* <Button variant="long_primary">Export Results</Button> */}
        </div>
        {/* kpi section */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full mt-10">
          <KpiCard name="Vote Count" value={100} icon={Vote} />
          <KpiCard name="Registered Voters" value={100} icon={Users} />
          <KpiCard name="Voter Turnout" value="100%" icon={BarChart2} />
          <KpiCard name="Voting Ends In" value="4:59 mins" icon={Clock} />
        </div>
        {/* position section */}
        <PositionSection />
      </div>
    </main>
  );
};

export default DemographicDashboard;
