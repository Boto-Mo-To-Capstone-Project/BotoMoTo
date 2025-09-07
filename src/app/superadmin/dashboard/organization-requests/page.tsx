"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";
import FileViewer from "@/components/FileViewer";

export default function SuperAdminOrgRequestPage() {
  // Local state for requests (pending) and all organizations
  const [orgRequests, setOrgRequests] = useState<Record<string, any>[]>([]);
  const [allOrgs, setAllOrgs] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // File viewer state
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{
    fileUrl: string;
    fileName: string;
    title: string;
    fileType?: "pdf" | "image" | "video" | "audio" | "text" | "unknown";
  } | null>(null);
  
  // Pagination state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => p + 1); // Table component will handle max bounds
  const handleLast = () => setPage(1); // Will be overridden by individual table's totalPages
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };
  
  // Calculate pagination for organizations instead of elections
  const filteredOrgRequests = orgRequests.filter((org) =>
    org.Name?.toLowerCase().includes(search.toLowerCase()) || ""
  );
  const filteredAllOrgs = allOrgs.filter((org) =>
    org.Name?.toLowerCase().includes(search.toLowerCase()) || ""
  );
  
  const requestsTotalPages = Math.ceil(Math.max(1, filteredOrgRequests.length) / pageSize);
  const allOrgsTotalPages = Math.ceil(Math.max(1, filteredAllOrgs.length) / pageSize);

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

  // File viewer handlers
  const handleViewFile = (fileUrl: string, fileName: string, title: string, fileType?: "pdf" | "image" | "video" | "audio" | "text" | "unknown") => {
    setFileViewerData({ fileUrl, fileName, title, fileType });
    setShowFileViewer(true);
  };

  const handleCloseFileViewer = () => {
    setShowFileViewer(false);
    setFileViewerData(null);
  };

  // Map API org to table row (keep id for actions but don't show it as a column)
  const toTableRow = (org: any) => ({
    id: org.id,
    Name: org.name,
    Email: org.email,
    Members: org.membersCount,
    Photo: org.logoObjectKey ? (
      <button
        onClick={() => {
          const fileUrl = `/api/files/${org.logoObjectKey}`;
          const fileName = extractFilename(org.logoObjectKey) || `${org.name}_logo`;
          handleViewFile(fileUrl, fileName, `${org.name} - Logo`, "image");
        }}
        className="text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none"
        type="button"
      >
        View Photo
      </button>
    ) : (
      "N/A"
    ),
    Letter: org.letterObjectKey ? (
      <button
        onClick={() => {
          const fileUrl = `/api/files/${org.letterObjectKey}`;
          const fileName = extractFilename(org.letterObjectKey) || `${org.name}_letter.pdf`;
          handleViewFile(fileUrl, fileName, `${org.name} - Organization Letter`, "pdf");
        }}
        className="text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none"
        type="button"
      >
        View Letter
      </button>
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
      {/*<Toaster position="top-center" />*/}
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min_h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            <>
              {/* Organization Requests (Pending) */}
              <Table
                loading={loading}
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
                totalPages={requestsTotalPages}
                onFirst={handleFirst}
                onPrev={handlePrev}
                onNext={handleNext}
                onLast={handleLast}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange} 
              />
              {/* All Organizations */}
              <Table
                loading={loading}
                title="All Organizations"
                columns={columns}
                data={allOrgs}
                page={page}
                totalPages={allOrgsTotalPages}
                onFirst={handleFirst}
                onPrev={handlePrev}
                onNext={handleNext}
                onLast={handleLast}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange} 
              />
            </>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {showFileViewer && fileViewerData && (
        <FileViewer
          fileUrl={fileViewerData.fileUrl}
          fileName={fileViewerData.fileName}
          onClose={handleCloseFileViewer}
          title={fileViewerData.title}
          fileType={fileViewerData.fileType}
        />
      )}
    </>
  );
}
