"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";
import SurveyPreview from "@/components/survey/SurveyPreview";
import { useRouter } from "next/navigation";

export default function SuperAdminSurveyPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter(); // ✅ init router

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/superadmin/surveys", { method: "GET" });
        if (!res.ok) throw new Error(`Failed to fetch surveys (${res.status})`);
        const json = await res.json();
        const list = json?.data?.surveys ?? [];
        setSurveys(list);

        const mapped = (list as any[]).map((s) => ({
          Survey_ID: s.id,
          Survey_Title: s.title,
          Description: s.description ?? "",
          Form_Schema: (
            <button
              className="text-indigo-600 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSurvey(s);
                setPreviewOpen(true);
              }}
            >
              View
            </button>
          ),
          Created_At: s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
          Deleted_At: s.deletedAt ? new Date(s.deletedAt).toLocaleString() : "",
          Is_Deleted: s.isDeleted ? "true" : "false",
          Is_Active: s.isActive ? "true" : "false",
        }));
        setRows(mapped);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Unable to load surveys");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // NEW: pagination state and handlers to satisfy Table props
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // Action handlers
  const handleAdd = () => {
    // TODO: Implement add functionality
    toast.success("Add button clicked"); // just remve this toast
    router.push("/superadmin/dashboard/create-survey");
  };

  const handleImport = () => {
    // TODO: Implement import functionality
    toast.success("Import button clicked");
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    toast.success("Edit button clicked");
  };

  const handleFilter = () => {
    // TODO: Implement filter functionality
    toast.success("Filter button clicked");
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    toast.success("Delete button clicked");
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
  };

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading ? (
              <div className="w-full p-4 bg-white shadow rounded-xl text-center text-gray-500">
                Loading surveys...
              </div>
            ) : (
              

              <Table
                title="All Surveys"
                columns={[
                  "Survey_ID",
                  "Survey_Title",
                  "Description",
                  "Form_Schema",
                  "Created_At",
                  "Deleted_At",
                  "Is_Deleted",
                  "Is_Active",
                ]}
                data={rows}
                showActions={true}
                actions={["add", "edit", "delete"]}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                // required pagination props
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

      {/* Preview Modal (styled like AuditDetailsModal) */}
      {previewOpen && selectedSurvey && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm lg:ml-68"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-3xl relative px-4 sm:px-6 pt-8 pb-6 mx-2 sm:mx-4 text-left space-y-6 border border-gray-200 overflow-y-auto max-h-[90vh] overflow-x-hidden">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>

            <div>
              <h3 className="text-lg font-semibold mb-2">Survey Preview</h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedSurvey?.title}
              </p>
              <SurveyPreview schema={selectedSurvey?.formSchema} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
