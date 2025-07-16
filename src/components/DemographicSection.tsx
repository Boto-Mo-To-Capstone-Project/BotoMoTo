"use client";

import KpiCard from "./KpiCard";
import { MapPinHouse } from "lucide-react";

const DemographicSection = () => {
  return (
    // naka hardcode muna d ko ksi alam logic hehe
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 w-full">
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href="/voter/live-dashboard/voting-scope/1"
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href="/voter/live-dashboard/voting-scope/1"
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href="/voter/live-dashboard/voting-scope/1"
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href="/voter/live-dashboard/voting-scope/1"
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href="/voter/live-dashboard/voting-scope/1"
      />
    </section>
  );
};

export default DemographicSection;
