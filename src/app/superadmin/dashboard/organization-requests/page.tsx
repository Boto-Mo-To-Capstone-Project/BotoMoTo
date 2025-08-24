"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";


interface UiElection {
  id: number;
  name: string;
  status: "Ongoing" | "Finished";
  votingDate: string;
  time: string;
}

export default function SuperAdminOrgRequestPage() {
  // Local state for requests (pending) and all organizations
  const [orgRequests, setOrgRequests] = useState<Record<string, any>[]>([]);
  const [allOrgs, setAllOrgs] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"All" | "Ongoing" | "Ended">("All");
    const [electionsList, setElectionsList] = useState<UiElection[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
  
    const [sortCol, setSortCol] = useState<
      "name" | "status" | "votingDate" | "time" | null
    >(null);
  
  const totalPages = Math.ceil(Math.max(1, electionsList.length) / pageSize);
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };
  
  // Filter by search and tab
  let filteredElections = electionsList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  if (tab === 'Ongoing') {
    filteredElections = filteredElections.filter(e => e.status === 'Ongoing');
  } else if (tab === 'Ended') {
    filteredElections = filteredElections.filter(e => e.status === 'Finished');
  }

  // Helper to extract filename from a stored path or URL
  const extractFilename = (path: string) => {
    if (!path) return "";
    try {
      const parts = path.split("/");
      return parts[parts.length - 1] || "";
    } catch {
      return "";
    }
  };

  // Map API org to table row (keep id for actions but don't show it as a column)
  const toTableRow = (org: any) => ({
    id: org.id,
    Name: org.name,
    Email: org.email,
    Members: org.membersCount,
    Photo: org.photoUrl ? (
      <a
        href={`/api/organizations/${org.id}/files/logo/${extractFilename(org.photoUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        View Photo
      </a>
    ) : (
      "N/A"
    ),
    Letter: org.letterUrl ? (
      <a
        href={`/api/organizations/${org.id}/files/letter/${extractFilename(org.letterUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        View Letter
      </a>
    ) : (
      "N/A"
    ),
    Status: org.status,
    Admin: org.admin?.name || org.adminId || "-",
  });

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch organizations");

      const orgs = (json?.data?.organizations || []) as any[];
      const all = orgs.map(toTableRow);
      const pending = orgs.filter((o) => o.status === "PENDING").map(toTableRow);

      setAllOrgs(all);
      setOrgRequests(pending);
    } catch (e: any) {
      toast.error(e?.message || "Error loading organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Approve/Reject handlers
  const handleApprove = async (row: Record<string, any>) => {
    if (!row.id) return toast.error("Missing organization ID");
    try {
      const res = await fetch(`/api/organizations/${row.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to approve");

      toast.success(`Approved ${row.Name}`);
      // Remove from requests and update status in all orgs
      setOrgRequests((prev) => prev.filter((o) => o.id !== row.id));
      setAllOrgs((prev) => prev.map((o) => (o.id === row.id ? { ...o, Status: "APPROVED" } : o)));
    } catch (e: any) {
      toast.error(e?.message || "Error approving organization");
    }
  };

  const handleReject = async (row: Record<string, any>) => {
    if (!row.id) return toast.error("Missing organization ID");
    try {
      const res = await fetch(`/api/organizations/${row.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to reject");

      toast.success(`Rejected ${row.Name}`);
      // Remove from requests and update status in all orgs
      setOrgRequests((prev) => prev.filter((o) => o.id !== row.id));
      setAllOrgs((prev) => prev.map((o) => (o.id === row.id ? { ...o, Status: "REJECTED" } : o)));
    } catch (e: any) {
      toast.error(e?.message || "Error rejecting organization");
    }
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
  };

  const columns = ["Name", "Email", "Members", "Photo", "Letter", "Status", "Admin"];

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min_h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading && orgRequests.length === 0 && allOrgs.length === 0 ? (
              <div className="w-full p-4 text-center text-gray-500">Loading organizations…</div>
            ) : (
              <>
                {/* Organization Requests (Pending) */}
                <Table
                  title="Organization Requests"
                  columns={columns}
                  data={orgRequests}
                  showActions={true}
                  actions={["approve", "reject"]}
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  page={page}
                  totalPages={Math.max(1, Math.ceil(filteredElections.length / pageSize))}
                  onFirst={handleFirst}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onLast={handleLast}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange} 
                />
                {/* All Organizations */}
                <Table
                  title="All Organizations"
                  columns={columns}
                  data={allOrgs}
                  page={page}
                  totalPages={Math.max(1, Math.ceil(filteredElections.length / pageSize))}
                  onFirst={handleFirst}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onLast={handleLast}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange} 
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
