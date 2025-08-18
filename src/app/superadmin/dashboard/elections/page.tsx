"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminElectionsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/elections");
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch elections");
        }
        const elections = json?.data?.elections || [];
        const mapped = elections.map((e: any) => {
          const orgName = e?.organization?.name || "—";
          const start = e?.schedule?.dateStart ? new Date(e.schedule.dateStart) : null;
          const finish = e?.schedule?.dateFinish ? new Date(e.schedule.dateFinish) : null;

          const fmtDate = (d: Date | null) =>
            d?.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
          const fmtTime = (d: Date | null) =>
            d?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

          const votingDate = start && finish ? `${fmtDate(start)} - ${fmtDate(finish)}` : "—";
          const time = start && finish ? `${fmtTime(start)} - ${fmtTime(finish)}` : "—";

          return {
            Election_Name: e?.name ?? "—",
            Status: e?.status ?? "—",
            Organization_Name: orgName,
            Voting_Date: votingDate,
            Time: time,
          } as Record<string, any>;
        });
        if (isMounted) setRows(mapped);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load elections");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // NEW: pagination state to satisfy Table props (reference: organization-requests)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

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
              <div className="w-full p-4 text-center text-gray-500">Loading elections…</div>
            ) : (
              <Table
                title="All Elections"
                columns={[
                  "Election_Name",
                  "Status",
                  "Organization_Name",
                  "Voting_Date",
                  "Time",
                ]}
                data={rows}
                // pass required pagination props
                page={page}
                totalPages={totalPages}
                onFirst={handleFirst}
                onPrev={handlePrev}
                onNext={handleNext}
                onLast={handleLast}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
