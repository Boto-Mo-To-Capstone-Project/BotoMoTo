"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { MdAdd, MdDownload, MdDelete, MdEdit, MdSave, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import VoterTable from '@/components/VoterTable';
import { VotersModal } from '@/components/VotersModal'; 
import { VotersDragandDropdown } from '@/components/VotersDragandDropdown';
import FileViewer from '@/components/FileViewer';
import { FilterToolbar } from '@/components/FilterToolbar';
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';

// Debounce hook
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function VoterDashboardPage() {
  // for dynamic confirmation modal
  const [modalOpen, setModalOpen] = useState(false);      
  const [modalConfig, setModalConfig] = useState<any>(null);

  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortCol, setSortCol] = useState<"name" | "status" | "scope" | "email" | "code" | "birthdate" | "voted" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editInitialData, setEditInitialData] = useState<{
    voterName?: string;
    voterSurname?: string;
    voterFirstName?: string;
    voterMiddleInitial?: string;
    email?: string;
    voterLimit?: number;
    numberOfWinners?: number;
    votingScopeId?: number | null;
  } | undefined>(undefined);
  const [editingVoterId, setEditingVoterId] = useState<number | null>(null);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Filter states for demonstration
  const [statusFilter, setStatusFilter] = useState("all");
  const [votedFilter, setVotedFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  // FileViewer state for template preview
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{
    fileUrl: string;
    fileName: string;
    title: string;
    fileType?: 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'unknown';
  } | null>(null);

  // Data state from API
  const [rawRows, setRawRows] = useState<Array<{
    id: number;
    name: string;
    status: string;
    scope: string;
    email: string;
    code: string;
    birthdate: string;
    voted: boolean;
  }>>([]);

  // Frontend sorting function
  const getSortedRows = () => {
    if (!sortCol) return rawRows;
    
    const sorted = [...rawRows].sort((a, b) => {
      let aVal: any = a[sortCol];
      let bVal: any = b[sortCol];
      
      // Handle different data types
      if (sortCol === "voted") {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDir === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return sorted;
  };

  // Get the final sorted rows for display
  const rows = getSortedRows();
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // added for lazy loading
  const [reloadKey, setReloadKey] = useState(0);
  // NEW: voting scopes for the election
  const [votingScopes, setVotingScopes] = useState<Array<{ id: number; name: string }>>([]);
  // NEW: All voters for duplicate detection (not paginated)
  const [allVoters, setAllVoters] = useState<Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>>([]);

  // Initialize state from URL once
  const initializedFromURL = useRef(false);
  useEffect(() => {
    if (initializedFromURL.current) return;
    initializedFromURL.current = true;

    const sp = new URLSearchParams(searchParams?.toString() || "");
    const p = Number(sp.get("page") || 1);
    const l = Number(sp.get("limit") || 10);
    const s = sp.get("search") || "";

    if (!Number.isNaN(p) && p > 0) setPage(p);
    if (!Number.isNaN(l) && l > 0) setPageSize(l);
    setSearch(s);
  }, [searchParams]);

  // FileViewer handlers
  const handleShowTemplatePreview = () => {
    setFileViewerData({
      fileUrl: "/assets/sample/voters.csv",
      fileName: "voters.csv",
      title: "Voter CSV Template",
      fileType: "text"
    });
    setShowFileViewer(true);
  };

  const handleCloseFileViewer = () => {
    setShowFileViewer(false);
    setFileViewerData(null);
  };

  // Keep URL in sync with state
  useEffect(() => {
    const current = searchParams?.toString() || "";
    const sp = new URLSearchParams(current);
    sp.set("page", String(page));
    sp.set("limit", String(pageSize));
    if (debouncedSearch) sp.set("search", debouncedSearch); else sp.delete("search");

    const target = sp.toString();
    if (target !== current) {
      router.replace(`?${target}`, { scroll: false });
    }
  }, [page, pageSize, debouncedSearch, router, searchParams]);

  // Pagination handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (col: "name" | "status" | "scope" | "email" | "code" | "birthdate" | "voted") => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filter definitions for FilterToolbar (demonstration)
  const voterFilters = useMemo(() => [
    {
      key: "status",
      label: "Status",
      value: statusFilter,
      onChange: (value: string) => {
        setStatusFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ]
    },
    {
      key: "voted",
      label: "Voted",
      value: votedFilter,
      onChange: (value: string) => {
        setVotedFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Voters" },
        { value: "voted", label: "Has Voted" },
        { value: "not_voted", label: "Not Voted" },
      ]
    },
    {
      key: "scope",
      label: "Voting Scope",
      value: scopeFilter,
      onChange: (value: string) => {
        setScopeFilter(value);
        setPage(1);
      },
      options: [
        { value: "all", label: "All Scopes" },
        // Note: In a real implementation, you would populate this from votingScopes state
        ...votingScopes.map(scope => ({ value: scope.id.toString(), label: scope.name }))
      ]
    }
  ], [statusFilter, votedFilter, scopeFilter, votingScopes]);

  const handleClearVoterFilters = () => {
    setStatusFilter("all");
    setVotedFilter("all");
    setScopeFilter("all");
    setPage(1);
  };

  // Bulk delete selected voters -> POST /api/voters/bulk { operation: 'soft_delete', voterIds, electionId }
  const handleDeleteSelected = () => {
    if (selectedIds.length < 1) return;

    // Check which voters have voted and which haven't
    const selectedVoters = rows.filter(r => selectedIds.includes(r.id));
    const votedVoters = selectedVoters.filter(v => v.voted);
    const nonVotedVoters = selectedVoters.filter(v => !v.voted);

    if (votedVoters.length > 0) {
      const votedNames = votedVoters.map(v => v.name).join(', ');
      if (nonVotedVoters.length === 0) {
        toast.error(`Cannot delete voters who have already voted: ${votedNames}`);
        return;
      } else {
        setModalConfig({
          title: "Confirm Partial Delete",
          description: `${votedVoters.length} voter(s) already voted: ${votedNames}\n\nDo you want to continue deleting the ${nonVotedVoters.length} voter(s) who haven't voted yet?`,
          confirmLabel: "Yes, Delete",
          variant: "delete",
          onConfirm: async () => {
            await doDelete(nonVotedVoters.map((v: any) => v.id), votedVoters.length);
          },
        });
      }
    } else {
      const plural = nonVotedVoters.length > 1 ? 'voters' : 'voter';
      setModalConfig({
        title: "Confirm Delete",
        description: `Delete ${nonVotedVoters.length} ${plural}? This will soft-delete them.`,
        confirmLabel: "Delete",
        variant: "delete",
        onConfirm: async () => {
          await doDelete(nonVotedVoters.map((v: any) => v.id), 0);
        },
      });
    }

    setModalOpen(true);
  };

  const doDelete = async (voterIdsToDelete: string[], skippedCount: number) => {
    try {
      const res = await fetch('/api/voters/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'soft_delete',
          voterIds: voterIdsToDelete,
          electionId
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to delete voters');
        return;
      }

      // Success message
      const deletedCount = voterIdsToDelete.length;
      let message = `Successfully deleted ${deletedCount} voter${deletedCount === 1 ? '' : 's'}`;
      if (skippedCount > 0) {
        message += `. ${skippedCount} voter${skippedCount === 1 ? '' : 's'} who already voted were skipped`;
      }
      toast.success(message);

      // Optimistic update + refresh
      setRawRows((prev) => prev.filter((r: any) => !voterIdsToDelete.includes(r.id)));
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Bulk delete voters error:', e);
      toast.error('Failed to delete voters');
    } finally {
      setLoading(false);
    }
  };

  // Hook Add -> POST /api/voters (single create)
  const handleAddVoter = async (data: any) => {
    try {
      if (!electionId || Number.isNaN(electionId)) return;
      setLoading(true);

      // VotersModal passes { voterName, email, votingScopeId, ... }
      const fullName = (data?.voterName || "").trim();
      let firstName = "";
      let middleName = "";
      let lastName = "";
      if (fullName) {
        const parts = fullName.split(/\s+/);
        // Modal builds as: Surname First MiddleInitial
        lastName = parts[0] || "";
        firstName = parts[1] || "";
        middleName = parts.slice(2).join(" ") || "";
      }

      const payload: any = {
        electionId,
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        email: data?.email?.trim() || undefined,
        isActive: true,
      };
      if (typeof data?.votingScopeId === 'number') {
        payload.votingScopeId = data.votingScopeId;
      }

      const res = await fetch('/api/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to create voter');
        return;
      }

      // Success: refresh list
      toast.success('Voter created successfully');
      setSelectedIds([]);
      setPage(1);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Create voter error:', e);
      toast.error('Failed to create voter');
    } finally {
      setLoading(false);
    }
  };

  // Edit voter: prefill modal from GET /api/voters/[id] and submit via PUT
  const openEditModal = async () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    setIsEditMode(true);
    setEditingVoterId(id);

    try {
      setLoading(true);
      const res = await fetch(`/api/voters/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false || !json?.data?.voter) {
        toast.error(json?.message || 'Failed to load voter');
        setIsEditMode(false);
        setEditingVoterId(null);
        return;
      }

      const v = json.data.voter as any;
      const initial = {
        voterSurname: v.lastName || "",
        voterFirstName: v.firstName || "",
        voterMiddleInitial: v.middleName || "",
        email: v.email || "",
        voterLimit: 1,
        numberOfWinners: 1,
        votingScopeId: v.votingScope?.id ?? null,
      };
      setEditInitialData(initial);
      setEditIsActive(!!v.isActive);
      setShowVotersModal(true);
    } catch (e) {
      console.error('Load voter error:', e);
      toast.error('Failed to load voter');
      setIsEditMode(false);
      setEditingVoterId(null);
    } finally {
      setLoading(false);
    }
  };

  // Edit: handles edit confirmation modal
  const handleEditSubmit = (data: any) => {
  setModalConfig({
    title: "Confirm Edit",
    description: "Are you sure you want to save the changes to this voter?",
    confirmLabel: "Save Changes",
    cancelLabel: "Cancel",
    variant: "edit",
    onConfirm: async () => {
      await handleEditVoterSave(data);
    },
  });
  setModalOpen(true);
};

  // handles Edit Submission 
  const handleEditVoterSave = async (data: any) => {
    if (!isEditMode || !editingVoterId) return;
    try {
      setLoading(true);
      const fullName = (data?.voterName || "").trim();
      let firstName = "";
      let middleName = "";
      let lastName = "";
      if (fullName) {
        const parts = fullName.split(/\s+/);
        lastName = parts[0] || "";
        firstName = parts[1] || "";
        middleName = parts.slice(2).join(" ") || "";
      }

      const payload: any = {
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
        email: data?.email?.trim() || undefined,
        isActive: editIsActive,
      };
      if (typeof data?.votingScopeId === 'number') {
        payload.votingScopeId = data.votingScopeId;
      }

      const res = await fetch(`/api/voters/${editingVoterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to update voter');
        return;
      }

      toast.success('Voter updated successfully');
      setShowVotersModal(false);
      setIsEditMode(false);
      setEditingVoterId(null);
      setEditInitialData(undefined);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Update voter error:', e);
      toast.error('Failed to update voter');
    } finally {
      setLoading(false);
    }
  };

  // Fetch voters from API
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    let alive = true;                // guard: only latest run updates state
    const run = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          // Removed sortCol and sortDir - frontend sorting only
        });
        const res = await fetch(`/api/voters?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          if (!alive) return;
          console.error("Failed to load voters:", json?.message || res.statusText);
          setHasLoaded(true);
          return;
        }

        // Map API voter -> table row
        const mapped = (json.data?.voters || []).map((v: any) => ({
          id: v.id,
          name: `${v.lastName ?? ""}, ${v.firstName ?? ""}${v.middleName ? " " + v.middleName : ""}`
            .trim()
            .replace(/^,\s*/, ""),
          status: v.isActive ? "Active" : "Inactive",
          scope: v.votingScope?.name ?? "—",
          email: v.email ?? "",
          code: v.code ?? "",
          birthdate: "",
          voted: !!v.voted,
        }));

        if (!alive) return;
        setRawRows(mapped);
        setTotalPages(json.data?.pagination?.totalPages || 1);
        setHasLoaded(true);          // ✅ only after a successful (non-aborted) fetch
      } catch (e: any) {
        if (e?.name === "AbortError") return; // do nothing on abort
        if (!alive) return;
        console.error("Voters fetch error:", e);
        setHasLoaded(true);          // treat as loaded so empty/error UI can show
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [electionId, page, pageSize, debouncedSearch, reloadKey]); // Removed sortCol, sortDir

  // NEW: Fetch voting scopes for this election (for the modal select)
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;
    const ctrl = new AbortController();
    const loadScopes = async () => {
      try {
        const res = await fetch(`/api/voting-scopes?electionId=${electionId}&all=true`, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) return;
        const items = (json?.data?.votingScopes || []).map((s: any) => ({ id: s.id, name: s.name }));
        setVotingScopes(items);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('Voting scopes fetch error:', e);
      }
    };
    loadScopes();
    return () => ctrl.abort();
  }, [electionId]);

  // NEW: Fetch ALL voters for duplicate detection (not paginated)
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;
    const ctrl = new AbortController();
    const loadAllVoters = async () => {
      try {
        // Fetch ALL voters using the new "all" parameter for duplicate checking
        const res = await fetch(`/api/voters?electionId=${electionId}&all=true`, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) return;
        
        const allVotersData = (json?.data?.voters || []).map((v: any) => ({
          id: v.id,
          firstName: v.firstName || '',
          lastName: v.lastName || '',
          email: v.email || ''
        }));
        setAllVoters(allVotersData);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('All voters fetch error:', e);
      }
    };
    loadAllVoters();
    return () => ctrl.abort();
  }, [electionId, reloadKey]);

  // Batch import voters from CSV
  const handleBatchImport = async (parsedVoters: Array<{
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    votingScopeId?: number;
    isActive: boolean;
    rowNumber: number;
  }>) => {
    try {
      if (!electionId || Number.isNaN(electionId)) return;
      setLoading(true);

      // Transform parsed voters to API format (no redundant parsing needed)
      const votersToImport = parsedVoters.map(voter => ({
        firstName: voter.firstName,
        middleName: voter.middleName || undefined,
        lastName: voter.lastName,
        email: voter.email.trim(),
        votingScopeId: voter.votingScopeId || undefined,
        isActive: voter.isActive,
      }));

      const res = await fetch('/api/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId,
          voters: votersToImport
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to import voters');
        return;
      }

      const importedCount = json?.data?.voters?.length || votersToImport.length;
      toast.success(`Successfully imported ${importedCount} voter${importedCount === 1 ? '' : 's'}`);
      
      setShowImportModal(false);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Batch import error:', e);
      toast.error('Failed to import voters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        {/* Universal App Header */}

        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            {/* Tabs */}
            <div className="flex-shrink-0">
            </div>
            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search for Voters"
              />
            </div>
            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
              <SubmitButton
                label=""
                variant="action"
                icon={<MdAdd size={20} />}
                title="Add"
                onClick={() => { 
                  setIsEditMode(false); 
                  setEditInitialData(undefined); 
                  setEditingVoterId(null);
                  setShowVotersModal(true); 
                }}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdFileUpload size={20} />}
                title="Import"
                onClick={() => setShowImportModal(true)}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdEdit size={20} />}
                title="Edit"
                onClick={
                  selectedIds.length === 1
                    ? openEditModal
                    : undefined
                }
                className={
                  selectedIds.length === 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDelete size={20} />}
                title="Delete"
                onClick={
                  selectedIds.length >= 1
                    ? handleDeleteSelected
                    : undefined
                }
                className={
                  selectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDownload size={20} />}
                title="Download"
                onClick={() => {
                        /* TODO: handle download */
                      }
                }
              />
            {/* Filter toolbar */}
              <FilterToolbar
                filters={voterFilters}
                buttonText='Filters'
              />    
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <VoterTable
              hasLoaded={hasLoaded}
              loading={loading}
              voters={rows}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              page={page}
              totalPages={totalPages}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
      </div>

      {/* VotersModal */}
      <VotersModal
        open={showVotersModal}
        onClose={() => { 
          setShowVotersModal(false); 
          setIsEditMode(false); 
          setEditingVoterId(null); 
          setEditInitialData(undefined); 
        }}
        onSave={isEditMode ? handleEditSubmit : handleAddVoter}
        initialData={editInitialData}
        title={isEditMode ? "Edit Voter" : "Voter Form"}
        submitLabel={isEditMode ? "Save" : "Add"}
        votingScopes={votingScopes}
      />

      {/* VotersDragandDropdown Modal */}
      <VotersDragandDropdown
        label="Import Voters"
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onUpload={handleBatchImport}
        onShowTemplatePreview={handleShowTemplatePreview}
        votingScopes={votingScopes}
        loading={loading}
        existingVoters={allVoters}
      />

      {/* FileViewer Modal (for template preview) */}
      {showFileViewer && fileViewerData && (
        <FileViewer
          fileUrl={fileViewerData.fileUrl}
          fileName={fileViewerData.fileName}
          onClose={handleCloseFileViewer}
          title={fileViewerData.title}
          fileType={fileViewerData.fileType}
        />
      )}
      {modalConfig && (
        <ConfirmationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          {...modalConfig}
        />
      )}
    </>
  );
}