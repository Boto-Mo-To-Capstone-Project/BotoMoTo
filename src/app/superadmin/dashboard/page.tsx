"use client";
// import { getUserFromCookie } from "@/lib/auth";
// import { redirect } from "next/navigation";
// import { supabase } from "@/lib/supabase";

import KpiCard from "@/components/KpiCard";
import SectionHeaderContainer from "@/components/SectionHeaderContainer";
import { Ban, CloudCheck } from "lucide-react";

export default function SuperadminDashboard() {
  // const user = await getUserFromCookie();

  // if (!user || user.role !== 'superadmin') {
  //   redirect('/login');
  // }

  // const { data: organizations, error } = await supabase
  //   .from('organizations')
  //   .select(`
  //     id,
  //     name,
  //     admins (id, email),
  //     elections (id, title, isActive)
  //   `);

  // if (error) {
  //   return <div className="p-4 text-red-500">Error loading organizations</div>;
  // }

  return (
    <main className="pt-16 px-8">
      <div className="flex flex-col items-start gap-8">
        <div>
          <p className="superadmin-heading">Hi, Chief Administrator!</p>
          <p className="superadmin-subheading mt-2">
            Welcome back, Chief Administrator! <br />
            You now have access to everything you've missed and full visibility
            of your database.
          </p>
        </div>
        {/* KPI Section*/}
        <div className="w-full">
          <SectionHeaderContainer>System Uptime (%)</SectionHeaderContainer>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
          </div>
        </div>
        {/* KPI Section*/}
        <div className="w-full">
          <SectionHeaderContainer>System Uptime (%)</SectionHeaderContainer>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
            <KpiCard
              name="System Uptime"
              value={`99%`}
              icon={CloudCheck}
              variant="superadmin"
              desc="4% vs last month"
              trend="up"
            />
            <KpiCard
              name="Error Rate"
              value={`1%`}
              icon={Ban}
              variant="superadmin"
              desc="40% vs last month"
              trend="down"
            />
          </div>
        </div>
      </div>

      {/* <h1 className="text-2xl font-bold mb-4">Superadmin Dashboard</h1>
      {organizations?.map((org) => (
        <div key={org.id} className="mb-4 border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">{org.name}</h2>

          <p className="mt-2">
            <strong>Admins:</strong>{" "}
            {org.admins?.length
              ? org.admins.map((a) => a.email).join(", ")
              : "None"}
          </p>

          <p>
            <strong>Active Election:</strong>{" "}
            {org.elections?.some((e) => e.isActive) ? "✅ Yes" : "❌ No"}
          </p>
        </div>
      ))} */}
    </main>
  );
}
