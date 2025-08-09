"use client";

  import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminAuditsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/audits");
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch audits");
        }
        const audits = json?.data?.audits || [];

        const mapped = audits.map((a: any) => ({
          Audit_ID: a.id,
          Actor_Role: a.actorRole,
          Action: a.action,
          IP_Address: a.ipAddress,
          User_Agent: a.userAgent,
          Time_Stamp: a.timestamp ? new Date(a.timestamp).toLocaleString() : "—",
        }));

        if (isMounted) setRows(mapped);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load audits");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading && rows.length === 0 ? (
              <div className="w-full p-4 text-center text-gray-500">Loading audits…</div>
            ) : (
              <Table
                title="All Audits"
                columns={["Audit_ID", "Actor_Role", "Action", "IP_Address", "User_Agent", "Time_Stamp"]}
                data={rows}
                pageSize={5}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
