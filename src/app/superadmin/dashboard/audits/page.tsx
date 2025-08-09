"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminAuditsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [rawDetails, setRawDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [detailsData, setDetailsData] = useState<any>(null);

  const openDetails = (index: number) => {
    const data = rawDetails[index];
    setDetailsData(data);
    setDetailsOpen(true);
  };

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
          Actor_ID: a.actorId || "—",
          Actor_Role: a.actorRole || "—",
          Action: a.action || "—",
          IP_Address: a.ipAddress || "—",
          User_Agent: a.userAgent || "—",
          Resource: a.resource || "—",
          Resource_ID: a.resourceId || "—",
          Time_Stamp: a.timestamp ? new Date(a.timestamp).toLocaleString() : "—",
        }));

        if (isMounted) {
          setRows(mapped);
          setRawDetails(audits.map((a: any) => ({ ...a.details, actorName: a.actorName, actorEmail: a.actorEmail })));
        }
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
                columns={[
                  "Audit_ID",
                  "Actor_ID",
                  "Actor_Role",
                  "Action",
                  "IP_Address",
                  "User_Agent",
                  "Resource",
                  "Resource_ID",
                  "Time_Stamp",
                ]}
                data={rows}
                pageSize={5}
                onRowClick={(row) => {
                  const idx = rows.findIndex((r) => r.Audit_ID === row.Audit_ID);
                  if (idx >= 0) openDetails(idx);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Audit Details</h3>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(detailsData, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t text-right">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
