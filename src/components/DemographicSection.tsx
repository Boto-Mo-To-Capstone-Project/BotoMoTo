"use client";

import KpiCard from "./KpiCard";
import { MapPinHouse } from "lucide-react";

const DemographicSection = () => {
  return (
    // naka hardcode muna d ko ksi alam logic hehe
    <section className="flex flex-wrap justify-center gap-4 mt-10">
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
