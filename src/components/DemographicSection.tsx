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
        href=""
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href=""
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href=""
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href=""
      />
      <KpiCard
        variant={"demographic"}
        name="Level 1"
        value={"40%"}
        icon={MapPinHouse}
        href=""
      />
    </section>
  );
};

export default DemographicSection;
