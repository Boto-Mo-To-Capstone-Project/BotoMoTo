"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { MdUpload, MdVisibility } from "react-icons/md";

import Table from "@/components/TableComponent";
import SurveyPreview from "@/components/survey/SurveyPreview";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useRouter } from "next/navigation";

export default function SuperAdminSurveyPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishingSurvey, setPublishingSurvey] = useState<any | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
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
          id: s.id, // Add ID for proper filtering
          Survey_Title: s.title,
          Description: s.description ?? "",
          Published: (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                s.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {s.isActive ? "Yes" : "No"}
            </span>
          ),
          Form_Schema: (
            <div className="flex justify-center">
              <button
                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSurvey(s);
                  setPreviewOpen(true);
                }}
                title="View schema"
              >
                <MdVisibility size={18} />
              </button>
            </div>
          ),
          Publish: (
            <div className="flex justify-center">
              <button
                className="publish-btn inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePublish(s);
                }}
                title="Publish survey"
                disabled={s.isActive}
              >
                <MdUpload size={18} className={s.isActive ? "text-gray-400" : ""} />
              </button>
            </div>
          ),
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
    router.push("/superadmin/dashboard/create-survey");
  };

  const handleImport = () => {
    // TODO: Implement import functionality
    toast.success("Import button clicked");
  };

  const handleEdit = () => {
    const surveyId = selectedIds[0];
    router.push(`/superadmin/dashboard/edit-survey/${surveyId}`);
  };

  const handleFilter = () => {
    // TODO: Implement filter functionality
    toast.success("Filter button clicked");
  };

  const handleDelete = async () => {
    if (!selectedIds.length) {
      toast.error("Please select survey(s) to delete");
      return;
    }
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedIds.length) {
      toast.error("No surveys selected");
      return;
    }

    try {
      const deletePromises = selectedIds.map(surveyId => 
        fetch(`/api/superadmin/surveys/${surveyId}`, {
          method: "DELETE",
        })
      );

      const responses = await Promise.all(deletePromises);
      
      // Check if any requests failed
      const failures = responses.filter(res => !res.ok);
      if (failures.length > 0) {
        const errorData = await failures[0].json();
        throw new Error(errorData?.message || "Failed to delete some surveys");
      }

      // Remove the deleted surveys from the state
      const updatedSurveys = surveys.filter(s => !selectedIds.includes(s.id.toString()));
      setSurveys(updatedSurveys);

      // Update the table rows
      const updatedRows = rows.filter(row => !selectedIds.includes(row.id.toString()));
      setRows(updatedRows);

      // Clear selection
      setSelectedIds([]);

      const count = selectedIds.length;
      toast.success(`${count} survey${count > 1 ? 's' : ''} deleted successfully`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete surveys");
    }
  };

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
  };

  const handlePublish = async (survey: any) => {
    // Find if there's already an active survey
    const currentActiveSurvey = surveys.find(s => s.isActive && s.id !== survey.id);
    
    setPublishingSurvey(survey);
    setActiveSurvey(currentActiveSurvey);
    setPublishModalOpen(true);
  };

  const confirmPublish = async () => {
    if (!publishingSurvey) return;

    try {
      const res = await fetch(`/api/superadmin/surveys/${publishingSurvey.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || "Failed to publish survey");
      }

      // Reload the surveys to get the updated state from the server
      const surveyRes = await fetch("/api/superadmin/surveys", { method: "GET" });
      if (surveyRes.ok) {
        const json = await surveyRes.json();
        const list = json?.data?.surveys ?? [];
        setSurveys(list);

        // Update the table rows with the fresh data
        const mapped = (list as any[]).map((s) => ({
          id: s.id,
          Survey_Title: s.title,
          Description: s.description ?? "",
          Published: (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                s.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {s.isActive ? "Yes" : "No"}
            </span>
          ),
          Form_Schema: (
            <div className="flex justify-center">
              <button
                className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSurvey(s);
                  setPreviewOpen(true);
                }}
                title="View schema"
              >
                <MdVisibility size={18} />
              </button>
            </div>
          ),
          Publish: (
            <div className="flex justify-center">
              <button
                className="publish-btn inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePublish(s);
                }}
                title="Publish survey"
                disabled={s.isActive}
              >
                <MdUpload size={18} className={s.isActive ? "text-gray-400" : ""} />
              </button>
            </div>
          ),
        }));
        setRows(mapped);
      }

      toast.success(`Survey "${publishingSurvey.title}" has been published successfully!`);
      
      // Reset modal states
      setPublishModalOpen(false);
      setPublishingSurvey(null);
      setActiveSurvey(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to publish survey");
    }
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
            <Table
              loading={loading}
              title="All Surveys"
              columns={[
                "Survey_Title",
                "Description", 
                "Published",
                "Form_Schema",
                "Publish",
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete ${selectedIds.length > 1 ? 'Surveys' : 'Survey'}`}
        description={selectedIds.length > 1 
          ? `Are you sure you want to delete ${selectedIds.length} surveys?\n\nThis action cannot be undone.`
          : `Are you sure you want to delete the survey "${
              surveys.find(s => s.id.toString() === selectedIds[0])?.title || 'this survey'
            }"?\n\nThis action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        variant="delete"
      />

      {/* Publish Confirmation Modal */}
      <ConfirmationModal
        open={publishModalOpen}
        onClose={() => {
          setPublishModalOpen(false);
          setPublishingSurvey(null);
          setActiveSurvey(null);
        }}
        title="Publish Survey"
        description={
          activeSurvey 
            ? `There is already an active survey: "${activeSurvey.title}"\n\nDo you want to replace it with "${publishingSurvey?.title}"?\n\nThis will make "${publishingSurvey?.title}" the new active survey and deactivate "${activeSurvey.title}".`
            : `Are you sure you want to publish "${publishingSurvey?.title}"?\n\nThis will make it the active survey available to users.`
        }
        confirmLabel={activeSurvey ? "Replace Survey" : "Publish Survey"}
        cancelLabel="Cancel"
        onConfirm={confirmPublish}
        variant="edit"
      />
    </>
  );
}
