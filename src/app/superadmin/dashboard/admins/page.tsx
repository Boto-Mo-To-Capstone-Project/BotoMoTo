"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Table from "@/components/TableComponent";
import { AdminModal } from "@/components/AdminModal";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  // pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  // NEW: track selected rows
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // state for showing editing admin modal
  const [showEditModal, setShowEditModal] = useState<any | null>(null);

  // so value will load immediately after editing
  const handleUpdated = (updated: any) => {
    const updatedItem = {
      ...updated,
      isDeleted: updated.isDeleted,
    };

    // Update the mapped table rows immediately
    setRows(prev =>
      prev.map(r =>
        r.id === String(updatedItem.id)
          ? {
              ...r,
              Is_Deleted: updatedItem.isDeleted ? "Yes" : "No",
              Updated_At: new Date(updatedItem.updatedAt).toLocaleString() || "—",
            }
          : r
      )
    );

    setShowEditModal(null);
  };

  const [reloadKey, setReloadKey] = useState(0);

  // Initialize state from URL once
  const initializedFromURL = useRef(false);
  useEffect(() => {
    if (initializedFromURL.current) return;
    initializedFromURL.current = true;

    const sp = new URLSearchParams(searchParams?.toString() || "");
    const p = Number(sp.get("page") || 1);
    const l = Number(sp.get("limit") || 10);

    if (!Number.isNaN(p) && p > 0) setPage(p);
    if (!Number.isNaN(l) && l > 0) setPageSize(l);
  }, [searchParams]);

  // Keep URL in sync with state
  useEffect(() => {
    const current = searchParams?.toString() || "";
    const sp = new URLSearchParams(current);
    sp.set("page", String(page));
    sp.set("limit", String(pageSize));

    const target = sp.toString();
    if (target !== current) {
      router.replace(`?${target}`, { scroll: false });
    }
  }, [page, pageSize, router, searchParams]);

  // Pagination handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };


  useEffect(() => {
    let isMounted = true;
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });
        const res = await fetch(`/api/admins?${qs.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json();

        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "Failed to fetch admins");
        }

        const list = json.data?.admins || [];
        const pagination = json.data?.pagination || { totalPages: 1 };

        console.log("Fetched admins:", list, pagination);

        const mapped = list.map((a: any) => ({
            id: String(a.id),
            Admin_ID: a.id,
            Name: a.name || "—",
            Email: a.email || "—",
            Role: a.role || "—",
            Is_Deleted: a.isDeleted ? "Yes" : "No",
            Created_At: new Date(a.createdAt).toLocaleString() || "—",
            Updated_At: new Date(a.updatedAt).toLocaleString() || "—",
            Organization_Name: a.organization?.name || "—",
            Organization_Status: a.organization?.status || "—",
        }));


        if (isMounted) {
          setRows(mapped);
          setAdmins(list);
          setTotalPages(pagination.totalPages || 1);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load admins");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAdmins();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize, reloadKey]);

  // table column keys (must match object keys)
  const columns = useMemo(() => [
    "Admin_ID",
    "Name",
    "Email",
    "Role",
    "Is_Deleted",
    "Created_At",
    "Updated_At",
    "Organization_Name",
    "Organization_Status",
  ], 
  []
);

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div id="main-window-template-component" className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-6">
            <Table
              title="Admins"
              columns={columns}
              data={rows}
              showActions
              actions={["edit", "export"]}
              page={page}
              totalPages={totalPages}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              loading={loading}
              // 🔑 Pass selection props
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}

              // Example Edit handler
              onEdit={() => {
              if (selectedIds.length === 1) {
                  const selectedAdmin = admins.find(a => String(a.id) === selectedIds[0]);
                  console.log("Editing admin:", selectedAdmin);
                  if (selectedAdmin) {
                  setShowEditModal(selectedAdmin); // <-- open modal
                  }
              }
              }}
            />
          </div>

        </div>
      </div>
      {showEditModal && (
      <AdminModal
        admin={showEditModal}
        onClose={() => setShowEditModal(null)}
        onUpdated={handleUpdated}
      />
      )} 
    </>

  );
}

