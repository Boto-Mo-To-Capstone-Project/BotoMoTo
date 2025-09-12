"use client";

import { useEffect, useState } from "react";
import Table from "@/components/TableComponent";
import { AdminModal } from "@/components/AdminModal";

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // NEW: track selected rows
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // state for showing editing admin modal
  const [showEditModal, setShowEditModal] = useState<any | null>(null);

  // so value will load immediately after adding
  const handleUpdated = (updated: any) => {
    const updatedItem = {
      ...updated,
    };

    setAdmins((prev) =>
      prev.map((p) => (p.id === updatedItem.id ? updatedItem : p))
    );
    setShowEditModal(null);
  };

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admins`, {
          method: "GET",
          credentials: "include",
        });
        const json = await res.json();
        if (json.success) {
            setAdmins(
                json.data.admins.map((a: any) => ({
                    ...a,
                    isDeleted: a.isDeleted ? "Yes" : "No",
                }))
            );
        } else {
          console.error("Failed to load admins:", json.error);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  // table column keys (must match object keys)
  const columns = [
    "id",
    "name",
    "email",
    "role",
    "isDeleted",
    "createdAt",
    "updatedAt",
  ];

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div id="main-window-template-component" className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-6">
            <Table
              title="Admins"
              columns={columns}
              data={admins}
              showActions
              actions={["edit", "export"]}
              page={page}
              pageSize={pageSize}
              totalPages={Math.ceil(admins.length / pageSize)}
              onFirst={() => setPage(1)}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() =>
              setPage((p) => Math.min(Math.ceil(admins.length / pageSize), p + 1))
              }
              onLast={() => setPage(Math.ceil(admins.length / pageSize))}
              onPageSizeChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
              }}
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

