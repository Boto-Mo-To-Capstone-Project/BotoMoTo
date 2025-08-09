"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminOrgRequestPage() {
  // Local state for requests (pending) and all organizations
  const [orgRequests, setOrgRequests] = useState<Record<string, any>[]>([]);
  const [allOrgs, setAllOrgs] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
                  onApprove={handleApprove}
                  onReject={handleReject}
                  pageSize={5}
                />
                {/* All Organizations */}
                <Table
                  title="All Organizations"
                  columns={columns}
                  data={allOrgs}
                  pageSize={5}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
