"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdVisibility } from "react-icons/md";

import Table from "@/components/TableComponent";
import FileViewer from "@/components/FileViewer";

export default function SuperAdminOrgRequestPage() {
  // Local state for requests (pending) and all organizations
  const [orgRequests, setOrgRequests] = useState<Record<string, any>[]>([]);
  const [allOrgs, setAllOrgs] = useState<Record<string, any>[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);
  const [loadingAllOrgs, setLoadingAllOrgs] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // File viewer state
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{
    fileUrl: string;
    fileName: string;
    title: string;
    fileType?: "pdf" | "image" | "video" | "audio" | "text" | "unknown";
  } | null>(null);
  
  // Pagination state - keep tables independent
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPageSize, setRequestsPageSize] = useState(10);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [allOrgsPage, setAllOrgsPage] = useState(1);
  const [allOrgsPageSize, setAllOrgsPageSize] = useState(10);
  const [allOrgsTotalPages, setAllOrgsTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const handleRequestsFirst = () => setRequestsPage(1);
  const handleRequestsPrev = () => setRequestsPage((p) => Math.max(1, p - 1));
  const handleRequestsNext = () => setRequestsPage((p) => Math.min(requestsTotalPages, p + 1));
  const handleRequestsLast = () => setRequestsPage(requestsTotalPages);
  const handleRequestsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRequestsPageSize(Number(e.target.value));
    setRequestsPage(1);
  };

  const handleAllOrgsFirst = () => setAllOrgsPage(1);
  const handleAllOrgsPrev = () => setAllOrgsPage((p) => Math.max(1, p - 1));
  const handleAllOrgsNext = () => setAllOrgsPage((p) => Math.min(allOrgsTotalPages, p + 1));
  const handleAllOrgsLast = () => setAllOrgsPage(allOrgsTotalPages);
  const handleAllOrgsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAllOrgsPageSize(Number(e.target.value));
    setAllOrgsPage(1);
  };

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
      <div className="flex justify-start">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const fileUrl = `/api/files/${org.logoObjectKey}`;
            const fileName = extractFilename(org.logoObjectKey) || `${org.name}_logo`;
            handleViewFile(fileUrl, fileName, `${org.name} - Logo`, "image");
          }}
          className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title={`View ${org.name} logo`}
          aria-label={`View ${org.name} logo`}
          type="button"
        >
          <MdVisibility size={18} />
        </button>
      </div>
    ) : (
      "N/A"
    ),
    Letter: org.letterObjectKey ? (
      <div className="flex justify-start">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const fileUrl = `/api/files/${org.letterObjectKey}`;
            const fileName = extractFilename(org.letterObjectKey) || `${org.name}_letter.pdf`;
            handleViewFile(fileUrl, fileName, `${org.name} - Organization Letter`, "pdf");
          }}
          className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title={`View ${org.name} letter`}
          aria-label={`View ${org.name} letter`}
          type="button"
        >
          <MdVisibility size={18} />
        </button>
      </div>
    ) : (
      "N/A"
    ),
    Status: org.status,
    Admin: org.admin?.name || org.adminId || "-",
  });

  useEffect(() => {
    let isMounted = true;
    const loadPendingOrganizations = async () => {
      try {
        setLoadingRequests(true);
        const res = await fetch(
          `/api/organizations?page=${requestsPage}&limit=${requestsPageSize}&status=PENDING`,
          { method: "GET" }
        );
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch pending organizations");
        }

        const orgs = (json?.data?.organizations || []) as any[];
        const pagination = json?.data?.pagination;
        const nextTotalPages = pagination?.totalPages || 1;

        if (!isMounted) return;

        setRequestsTotalPages(nextTotalPages);
        if (requestsPage > nextTotalPages) {
          setRequestsPage(nextTotalPages);
          return;
        }
        setOrgRequests(orgs.map(toTableRow));
      } catch (e: any) {
        if (isMounted) {
          toast.error(e?.message || "Error loading pending organizations");
        }
      } finally {
        if (isMounted) {
          setLoadingRequests(false);
        }
      }
    };

    loadPendingOrganizations();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsPage, requestsPageSize, reloadKey]);

  useEffect(() => {
    let isMounted = true;
    const loadAllOrganizations = async () => {
      try {
        setLoadingAllOrgs(true);
        const res = await fetch(
          `/api/organizations?page=${allOrgsPage}&limit=${allOrgsPageSize}`,
          { method: "GET" }
        );
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch organizations");
        }

        const orgs = (json?.data?.organizations || []) as any[];
        const pagination = json?.data?.pagination;
        const nextTotalPages = pagination?.totalPages || 1;

        if (!isMounted) return;

        setAllOrgsTotalPages(nextTotalPages);
        if (allOrgsPage > nextTotalPages) {
          setAllOrgsPage(nextTotalPages);
          return;
        }
        setAllOrgs(orgs.map(toTableRow));
      } catch (e: any) {
        if (isMounted) {
          toast.error(e?.message || "Error loading organizations");
        }
      } finally {
        if (isMounted) {
          setLoadingAllOrgs(false);
        }
      }
    };

    loadAllOrganizations();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrgsPage, allOrgsPageSize, reloadKey]);

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
      setSelectedIds([]);
      setReloadKey((prev) => prev + 1);
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
      setSelectedIds([]);
      setReloadKey((prev) => prev + 1);
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
                loading={loadingRequests}
                title="Organization Requests"
                columns={columns}
                data={orgRequests}
                showActions={true}
                actions={["approve", "reject"]}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onApprove={handleApprove}
                onReject={handleReject}
                page={requestsPage}
                totalPages={requestsTotalPages}
                onFirst={handleRequestsFirst}
                onPrev={handleRequestsPrev}
                onNext={handleRequestsNext}
                onLast={handleRequestsLast}
                pageSize={requestsPageSize}
                onPageSizeChange={handleRequestsPageSizeChange}
              />
              {/* All Organizations */}
              <Table
                loading={loadingAllOrgs}
                title="All Organizations"
                columns={columns}
                data={allOrgs}
                page={allOrgsPage}
                totalPages={allOrgsTotalPages}
                onFirst={handleAllOrgsFirst}
                onPrev={handleAllOrgsPrev}
                onNext={handleAllOrgsNext}
                onLast={handleAllOrgsLast}
                pageSize={allOrgsPageSize}
                onPageSizeChange={handleAllOrgsPageSizeChange}
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
