"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";
import AuditDetailsModal from "@/components/AuditDetailsModal";

export default function SuperAdminAuditsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  
  // Pagination state only (search and sorting handled by table component)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [actorRoleFilter, setActorRoleFilter] = useState("all");
  
  const [reloadKey, setReloadKey] = useState(0);

  // Initialize state from URL once
  const initializedFromURL = useRef(false);
  useEffect(() => {
    if (initializedFromURL.current) return;
    initializedFromURL.current = true;

    const sp = new URLSearchParams(searchParams?.toString() || "");
    const p = Number(sp.get("page") || 1);
    const l = Number(sp.get("limit") || 10);
    const action = sp.get("action") || "all";
    const resource = sp.get("resource") || "all";
    const actorRole = sp.get("actorRole") || "all";

    if (!Number.isNaN(p) && p > 0) setPage(p);
    if (!Number.isNaN(l) && l > 0) setPageSize(l);
    setActionFilter(action);
    setResourceFilter(resource);
    setActorRoleFilter(actorRole);
  }, [searchParams]);

  // Keep URL in sync with state
  useEffect(() => {
    const current = searchParams?.toString() || "";
    const sp = new URLSearchParams(current);
    sp.set("page", String(page));
    sp.set("limit", String(pageSize));
    if (actionFilter !== "all") sp.set("action", actionFilter); else sp.delete("action");
    if (resourceFilter !== "all") sp.set("resource", resourceFilter); else sp.delete("resource");
    if (actorRoleFilter !== "all") sp.set("actorRole", actorRoleFilter); else sp.delete("actorRole");

    const target = sp.toString();
    if (target !== current) {
      router.replace(`?${target}`, { scroll: false });
    }
  }, [page, pageSize, actionFilter, resourceFilter, actorRoleFilter, router, searchParams]);

  // Pagination handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const openDetails = (index: number) => {
    const data = audits[index];
    setSelectedAudit(data);
    setDetailsOpen(true);
  };

  // Fetch audits from API
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          ...(actionFilter !== "all" ? { action: actionFilter } : {}),
          ...(resourceFilter !== "all" ? { resource: resourceFilter } : {}),
          ...(actorRoleFilter !== "all" ? { actorRole: actorRoleFilter } : {}),
        });
        
        const res = await fetch(`/api/audits?${qs.toString()}`);
        const json = await res.json();
        
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || "Failed to fetch audits");
        }
        
        const list = json?.data?.audits || [];
        const pagination = json?.data?.pagination || {};

        const mapped = list.map((a: any) => ({
          Audit_ID: a.id,
          Actor_ID: a.actorId || "—",
          Actor_Role: a.actorRole || "—",
          Action: a.action || "—",
          IP_Address: a.ipAddress || "—",
          User_Agent: a.userAgent ? (a.userAgent.length > 50 ? a.userAgent.substring(0, 50) + "..." : a.userAgent) : "—",
          Resource: a.resource || "—",
          Resource_ID: a.resourceId || "—",
          Time_Stamp: a.timestamp ? new Date(a.timestamp).toLocaleString() : "—",
        }));

        if (isMounted) {
          setRows(mapped);
          setAudits(list);
          setTotalPages(pagination.totalPages || 1);
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
  }, [page, pageSize, actionFilter, resourceFilter, actorRoleFilter, reloadKey]);

  const columns = useMemo(
    () => [
      "Audit_ID",
      "Actor_ID", 
      "Actor_Role",
      "Action",
      "IP_Address",
      "User_Agent",
      "Resource",
      "Resource_ID",
      "Time_Stamp",
    ],
    []
  );

  // Filter configurations for the Table component
  const filters = useMemo(() => [
    {
      key: "action",
      label: "Action",
      value: actionFilter,
      onChange: (value: string) => {
        setActionFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Actions" },
        { value: "CREATE", label: "Create" },
        { value: "READ", label: "Read" },
        { value: "UPDATE", label: "Update" },
        { value: "DELETE", label: "Delete" },
        { value: "LOGIN", label: "Login" },
        { value: "LOGOUT", label: "Logout" },
        { value: "VOTE", label: "Vote" },
        { value: "APPROVE", label: "Approve" },
        { value: "REJECT", label: "Reject" },
        { value: "UPLOAD", label: "Upload" },
      ]
    },
    {
      key: "resource",
      label: "Resource",
      value: resourceFilter,
      onChange: (value: string) => {
        setResourceFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Resources" },
        { value: "ELECTION", label: "Election" },
        { value: "VOTER", label: "Voter" },
        { value: "CANDIDATE", label: "Candidate" },
        { value: "POSITION", label: "Position" },
        { value: "ORGANIZATION", label: "Organization" },
        { value: "USER", label: "User" },
      ]
    },
    {
      key: "actorRole",
      label: "Actor Role",
      value: actorRoleFilter,
      onChange: (value: string) => {
        setActorRoleFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Roles" },
        { value: "SUPER_ADMIN", label: "Super Admin" },
        { value: "ADMIN", label: "Admin" },
        { value: "VOTER", label: "Voter" },
      ]
    }
  ], [actionFilter, resourceFilter, actorRoleFilter]);

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {loading ? (
            <div className="w-full p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Loading audits...
              </div>
            </div>
          ) : (
            <Table
              title="All Audits"
              columns={columns}
              data={rows}
              showActions={true}
              actions={["export"]}
              showFilters={true}
              filters={filters}
              onRowClick={(row) => {
                const idx = rows.findIndex((r) => r.Audit_ID === row.Audit_ID);
                if (idx >= 0) openDetails(idx);
              }}
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

      <AuditDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} audit={selectedAudit} />
    </>
  );
}
