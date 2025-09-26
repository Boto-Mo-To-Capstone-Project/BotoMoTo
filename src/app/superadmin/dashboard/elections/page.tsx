"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";
import { Loader2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Button from "@/components/Button";
import { InputField } from "@/components/InputField";
import { useRouter } from "next/navigation";
import { MdVisibility } from "react-icons/md";

// types for integrity verification
type VerificationResult = {
  election: {
    id: number;
    name: string;
    status: string;
    organization: string;
  };
  verification: {
    isValid: boolean;
    integrityPercentage: number;
    totalVotes: number;
    verifiedVotes: number;
    errorCount: number;
  };
};

export default function SuperAdminElectionsPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // integrity verification states
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        // Use pagination for superadmin elections page
        const res = await fetch(`/api/elections?page=${page}&limit=${pageSize}`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch elections");
        }
        const elections = json?.data?.elections || [];
        const pagination = json?.data?.pagination;
        
        if (pagination) {
          setTotalPages(pagination.totalPages);
          setTotalCount(pagination.totalCount);
        }
        
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
            Election_ID: e?.id ?? "-",
            Election_Name: e?.name ?? "—",
            Status: e?.status ?? "—",
            Organization_Name: orgName,
            Voting_Date: votingDate,
            Time: time,
            View_Dashboard: ( // to view live dashboard
              <div className="flex justify-center">
                <button
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    sessionStorage.setItem("superAdminContext", "true");
                    sessionStorage.setItem("adminElectionId", e.id.toString());
                    router.push(`/voter/live-dashboard`);
                  }}
                  title="View Live Dashboard"
                >
                  <MdVisibility size={18} />
                </button>
              </div>
            ),
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
  }, [page, pageSize]); // Add dependencies for pagination

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // method to handle verify-elections
  const handleVerify = async () => {
    setVerifying(true);
    setResults([]);
    setSummary(null);

    try {
      const ids = input
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const res = await fetch("/api/elections/bulk/verify-integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionIds: ids }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to verify elections");
      } else {
        setResults(data.data.results);
        setSummary(data.data.summary);
        toast.success(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error occurred");
    } finally {
      setVerifying(false);
    }
  };


  // select all functionality for integrity
  const [selectAll, setSelectAll] = useState(false);
  const [allElectionIds, setAllElectionIds] = useState<number[]>([]);

  // Fetch all election IDs for select all functionality
  useEffect(() => {
    const fetchAllIds = async () => {
      try {
        const res = await fetch("/api/elections?all=true");
        const json = await res.json();
        if (res.ok && json?.success) {
          const elections = json?.data?.elections || [];
          const ids = elections.map((e: any) => e.id).filter((id: any) => id);
          setAllElectionIds(ids);
        }
      } catch (err) {
        console.error("Failed to fetch all election IDs:", err);
      }
    };
    fetchAllIds();
  }, []);

  const handleSelectAll = () => {
    if (!selectAll) {
      // Use all election IDs from API
      const allIds = allElectionIds.join(", ");
      setInput(allIds);
    } else {
      setInput("");
    }
    setSelectAll(!selectAll);
  };

  // Keep integrity checkbox in sync with manual input changes
  useEffect(() => {
    const allIds = allElectionIds.join(", ");
    if (input.replace(/\s+/g, "") === allIds.replace(/\s+/g, "")) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [input, allElectionIds]);

  

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            <Table
              loading={loading}
              title="All Elections"
              columns={[
                "Election_ID",
                "Election_Name",
                "Status",
                "Organization_Name",
                "Voting_Date",
                "Time",
                "View_Dashboard"
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
          </div>

          {/* integrity div */}
          <div className="p-4 space-y-4"> 
            <p className="font-semibold text-xl mb-4">Election Integrity Checker</p>
            {/* Integrity Input */}
            <div className="flex flex-col xs:flex-row gap-4 w-full">
              <SearchBar
                value={input}
                placeholder="Enter election IDs (e.g. 1, 2, 3)"
                onChange={(e) => setInput(e.target.value)}/>

              <InputField
                type="checkbox"
                label="Select All Elections"
                checked={selectAll}
                onChange={handleSelectAll}
                wrapperClassName="flex flex-row-reverse max-w-40 items-center justify-end gap-4"
              />

              <Button
                onClick={handleVerify}
                disabled={verifying || !input.trim()}
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify
              </Button>
            </div>

            {/* Integrity Summary */}
            {summary && (
              <div className="rounded-xl shadow border border-gray-200 ">
                <h2 className="text-lg font-semibold mb-2 pt-4 pl-4">Verification Summary</h2>
                <div className="p-4 space-y-4 text-md"> 
                  <p>Elections Verified: {summary.electionsVerified}</p>
                  <p>
                    Overall Integrity:{" "}
                    <span
                      className={
                        summary.overallValid ? "text-green-900" : "text-red-900"
                      }
                    >
                      {summary.overallIntegrityPercentage}%
                    </span>
                  </p>
                  <p>
                    Votes Verified: {summary.totalVerified}/{summary.totalVotes}
                  </p>
                </div>
              
              </div>
            )}

            {/* Verification Results (below table) */}
            {results.length > 0 && (
              <div className="w-full p-4 bg-white shadow rounded-xl mt-5">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow">
                      <tr className="text-left text-gray-700 border-b font-semibold text-base">
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Election ID</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Name</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Organization</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Status</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Integrity </th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Total Votes</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Verified Votes</th>
                        <th className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.election.id} className="border-b border-gray-200 hover:bg-gray-50 transition bg-gray-50 cursor-pointer">
                          <td className="px-4 py-2">{r.election.id}</td>
                          <td className="px-4 py-2">{r.election.name}</td>
                          <td className="px-4 py-2">{r.election.organization}</td>
                          <td className="px-4 py-2">{r.election.status}</td>
                          <td
                            className={`px-4 py-2 font-medium ${
                              r.verification.isValid
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {r.verification.integrityPercentage}%
                          </td>
                          <td className="px-4 py-2">
                            {r.verification.totalVotes}
                          </td>
                          <td className="px-4 py-2">
                            {r.verification.verifiedVotes}
                          </td>
                          <td className="px-4 py-2">{r.verification.errorCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
