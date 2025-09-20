"use client";
import { useState, useEffect, useRef } from 'react';
import { MdAdd, MdDownload, MdDelete, MdEdit, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import PositionsTable from '@/components/PositionsTable';
import { PositionsModal } from '@/components/PositionsModal';
import { PositionCandidatesModal } from '@/components/PositionCandidatesModal';
import { PositionsDragandDropdown } from '@/components/PositionsDragandDrop';
import FileViewer from '@/components/FileViewer';
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

export default function PositionsDashboardPage() {
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
  const [sortCol, setSortCol] = useState<"position" | "voteLimit" | "numberOfWinners" | "scopeName" | "order" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Add file viewer state for template preview parity with voters page
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{ fileUrl: string; fileName: string; title: string; fileType?: 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'unknown'; } | null>(null);

  // Edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null);
  const [editInitialData, setEditInitialData] = useState<any>(undefined);

  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // added for lazy loading
  const [totalPages, setTotalPages] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // NEW: voting scopes for the election
  const [votingScopes, setVotingScopes] = useState<Array<{ id: number; name: string }>>([]);
  // NEW: All positions for duplicate detection (not paginated)
  const [allPositions, setAllPositions] = useState<Array<{
    id: number;
    name: string;
    votingScopeId: number | null;
  }>>([]);

  // NEW: Position candidates modal state
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ id: number; name: string } | null>(null);
  const [positionCandidates, setPositionCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

    // Data state from API
  const [rows, setRows] = useState<Array<{
    id: number;
    position: string;
    voteLimit: number;
    numberOfWinners: number;
    scopeName: string;
    order: number;
  }>>([]);

  // Frontend sorting function 
  const getSortedRows = () => {
    if (!sortCol) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortCol) {
        case 'position': {
          const av = (a.position || '').toString().toLowerCase();
          const bv = (b.position || '').toString().toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        case 'scopeName': {
          const av = (a.scopeName || '').toString().toLowerCase();
          const bv = (b.scopeName || '').toString().toLowerCase();
          return av.localeCompare(bv) * dir;
        }
        case 'order':
          return ((a.order ?? 0) - (b.order ?? 0)) * dir;
        case 'voteLimit':
          return ((a.voteLimit ?? 0) - (b.voteLimit ?? 0)) * dir;
        case 'numberOfWinners':
          return ((a.numberOfWinners ?? 0) - (b.numberOfWinners ?? 0)) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  };

  // Sorted data for display
  const sortedRows = getSortedRows();

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
  const handleSort = (col: "position" | "voteLimit" | "numberOfWinners" | "scopeName" | "order") => {
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
  const handleSavePosition = async (data: { position: string; voteLimit: number; numberOfWinners: number; order: number; votingScopeId?: number | null }) => {
    try {
      if (!electionId || Number.isNaN(electionId)) return;
      setModalLoading(true);

      const payload: any = {
        electionId,
        name: data.position.trim(),
        voteLimit: data.voteLimit,
        numOfWinners: data.numberOfWinners,
        order: data.order,
        isActive: true,
        // Always include votingScopeId, even when null for "All voters"
        votingScopeId: data.votingScopeId,
      };

      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to create position');
        return;
      }

      // Success: refresh list
      toast.success('Position created successfully');
      setSelectedIds([]);
      setPage(1);
      setReloadKey((k) => k + 1);
      setShowModal(false);
    } catch (e) {
      console.error('Create position error:', e);
      toast.error('Failed to create position');
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk delete selected positions -> POST /api/positions/bulk { operation: 'soft_delete', positionIds, electionId }
  const handleDeleteSelected = () => {
    if (selectedIds.length < 1) return;

    const plural = selectedIds.length > 1 ? 'positions' : 'position';

    setModalConfig({
      title: "Confirm Delete",
      description: `Delete ${selectedIds.length} ${plural}? This will soft-delete them.`,
      confirmLabel: "Delete",
      variant: "delete",
      onConfirm: async () => {
        await doDelete(selectedIds);
      },
    });

    setModalOpen(true);
  };

  const doDelete = async (selectedIds: number[]) => {
    try {
      setModalLoading(true);

      const res = await fetch('/api/positions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'soft_delete',
          positionIds: selectedIds,
          electionId
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to delete positions');
        return;
      }

      // Success message
      const deletedCount = selectedIds.length;
      toast.success(`Successfully deleted ${deletedCount} position${deletedCount === 1 ? '' : 's'}`);

      // Optimistic update + refresh
      setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Bulk delete positions error:', e);
      toast.error('Failed to delete positions');
    } finally {
      setModalLoading(false);
    }
  };

  // Edit position: prefill modal from GET /api/positions/[id] and submit via PUT
  const openEditModal = async () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    setIsEditMode(true);
    setEditingPositionId(id);

    try {
      setModalLoading(true);
      const res = await fetch(`/api/positions/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false || !json?.data?.position) {
        toast.error(json?.message || 'Failed to load position');
        setIsEditMode(false);
        setEditingPositionId(null);
        return;
      }

      const p = json.data.position as any;
      const initial = {
        position: p.name || "",
        voteLimit: p.voteLimit || 1,
        numberOfWinners: p.numOfWinners || 1,
        order: p.order || 0,
        votingScopeId: p.votingScope?.id ?? null,
        // Provide electionId and positionId so modal can compute next order and validate duplicates
        electionId: Number(electionId),
        positionId: id,
      };
      setEditInitialData(initial);
      setShowModal(true);
    } catch (e) {
      console.error('Load position error:', e);
      toast.error('Failed to load position');
      setIsEditMode(false);
      setEditingPositionId(null);
    } finally {
      setModalLoading(false);
    }
  };

  // Edit: handles edit confirmation modal
  const handleEditSubmit = (data: { 
    position: string; 
    voteLimit: number; 
    numberOfWinners: number; 
    order: number; 
    votingScopeId?: number | null 
  }) => {
    setModalConfig({
      title: "Confirm Edit",
      description: "Are you sure you want to save the changes to this position?",
      confirmLabel: "Save Changes",
      cancelLabel: "Cancel",
      variant: "edit",
      onConfirm: async () => {
        await handleEditPositionSave(data);
      },
    });
    setModalOpen(true);
  };

  const handleEditPositionSave = async (data: { position: string; voteLimit: number; numberOfWinners: number; order: number; votingScopeId?: number | null }) => {
    if (!isEditMode || !editingPositionId) return;
    try {
      setModalLoading(true);

      const payload: any = {
        name: data.position.trim(),
        voteLimit: data.voteLimit,
        numOfWinners: data.numberOfWinners,
        order: data.order,
        isActive: true,
        // Always include votingScopeId, even when null for "All voters"
        votingScopeId: data.votingScopeId,
      };

      const res = await fetch(`/api/positions/${editingPositionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to update position');
        return;
      }

      toast.success('Position updated successfully');
      setShowModal(false);
      setIsEditMode(false);
      setEditingPositionId(null);
      setEditInitialData(undefined);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Update position error:', e);
      toast.error('Failed to update position');
    } finally {
      setModalLoading(false);
    }
  };

  // Import positions: POST /api/positions with positions[] array
  const handleImportPositions = async (parsed: Array<{ position: string; voteLimit: number; numberOfWinners: number; order: number; votingScopeId?: number }>) => {
    try {
      if (!electionId || Number.isNaN(electionId)) return;
      setModalLoading(true);
      if (!parsed.length) {
        toast.error('No positions to import');
        return;
      }
      // Transform to API payload expected by /api/positions bulk path (positions[])
      const positions = parsed.map(p => ({
        electionId,
        name: p.position.trim(),
        voteLimit: p.voteLimit || 1,
        numOfWinners: p.numberOfWinners || 1,
        order: typeof p.order === 'number' ? p.order : 0,
        votingScopeId: p.votingScopeId,
        isActive: true,
      }));

      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to import positions');
        return;
      }
      const count = json?.data?.positions?.length || positions.length;
      toast.success(`Successfully imported ${count} position${count === 1 ? '' : 's'}`);
      setShowImportModal(false);
      setReloadKey(k => k + 1);
      setPage(1);
    } catch (e) {
      console.error('Import positions error:', e);
      toast.error('Failed to import positions');
    } finally {
      setModalLoading(false);
    }
  };

  // NEW: Handler for showing position candidates
  const handleShowCandidates = async (positionId: number, positionName: string) => {
    setSelectedPosition({ id: positionId, name: positionName });
    setShowCandidatesModal(true);
    setLoadingCandidates(true);
    
    try {
      const res = await fetch(`/api/candidates?electionId=${electionId}&positionId=${positionId}`);
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok || json?.success === false) {
        toast.error(json?.message || 'Failed to load candidates');
        setPositionCandidates([]);
        return;
      }

      // Map API candidate data to match modal interface
      const candidates = (json.data?.candidates || []).map((c: any) => ({
        id: c.id,
        name: `${c.voter?.firstName || ''} ${c.voter?.lastName || ''}`.trim() || 'Unknown',
        email: c.voter?.email || '',
        party: c.party?.name || '—',
      }));
      
      setPositionCandidates(candidates);
    } catch (error) {
      console.error('Error loading position candidates:', error);
      toast.error('Failed to load candidates');
      setPositionCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Fetch positions from API (no sorting params; sorting is client-side)
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        const res = await fetch(`/api/positions?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          if (!alive) return;
          console.error("Failed to load positions:", json?.message || res.statusText);
          setHasLoaded(true);
          return;
        }

        // Map API position -> table row
        const mapped = (json.data?.positions || []).map((p: any) => ({
          id: p.id,
          position: p.name || "",
          voteLimit: p.voteLimit || 1,
          numberOfWinners: p.numOfWinners || 1,
          scopeName: p.votingScope?.name ?? "—",
          order: p.order || 0,
        }));

        if (!alive) return;
        setRows(mapped);
        setTotalPages(json.data?.pagination?.totalPages || 1);
        setHasLoaded(true)
      } catch (e: any) {
        if (e?.name === "AbortError") return; // do nothing on abort
        if (!alive) return;
        console.error("Positions fetch error:", e);
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
  }, [electionId, page, pageSize, debouncedSearch, reloadKey]);

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

  // NEW: Fetch ALL positions for duplicate detection (not paginated)
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;
    const ctrl = new AbortController();
    const loadAllPositions = async () => {
      try {
        // Fetch ALL positions using the "all" parameter for duplicate checking
        const res = await fetch(`/api/positions?electionId=${electionId}&all=true`, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) return;
        
        const allPositionsData = (json?.data?.positions || []).map((p: any) => ({
          id: p.id,
          name: p.name || '',
          votingScopeId: p.votingScopeId || null
        }));
        setAllPositions(allPositionsData);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('All positions fetch error:', e);
      }
    };
    loadAllPositions();
    return () => ctrl.abort();
  }, [electionId, reloadKey]);

  // CSV download helper
  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => headers.map(header => 
        `"${String(row[header.toLowerCase()] || '').replace(/"/g, '""')}"`
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download all positions
  const handleDownloadPositions = () => {
    const headers = ['ID', 'Position', 'VoteLimit', 'NumberOfWinners', 'ScopeName', 'Order'];
    const filename = `positions-${electionId}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(rows, filename, headers);
    toast.success(`Downloaded ${rows.length} position(s)`);
  };

  return (
    <>
      {/*<Toaster position="top-center" />*/}
      <PositionsModal
        open={showModal}
        onClose={() => { 
          setShowModal(false); 
          setIsEditMode(false); 
          setEditingPositionId(null); 
          setEditInitialData(undefined); 
        }}
        onSave={isEditMode ? handleEditSubmit : handleSavePosition}
        initialData={editInitialData}
        title={isEditMode ? "Edit Position" : "Position Form"}
        submitLabel={isEditMode ? "Save" : "Add"}
        disableSave={modalLoading}
        votingScopes={votingScopes}
      />
      {/* Import Positions Modal */}
      <PositionsDragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Positions"
        accept=".csv"
        id="import-positions-file"
        maxSizeMB={5}
        onUpload={async (positions) => { await handleImportPositions(positions); }}
        votingScopes={votingScopes}
        loading={modalLoading}
        existingPositions={allPositions}
        onShowTemplatePreview={() => {
          setFileViewerData({
            fileUrl: '/assets/sample/positions.csv',
            fileName: 'positions.csv',
            title: 'Position CSV Template',
            fileType: 'text'
          });
          setShowFileViewer(true);
        }}
      />
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
                placeholder="Search for Positions"
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
                  setEditingPositionId(null);
                  // Provide electionId so the modal can fetch suggested/used orders per scope
                  setEditInitialData({ electionId: Number(electionId) }); 
                  setShowModal(true); 
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
              {/* <SubmitButton
                label=""
                variant="action"
                icon={<MdFilterList size={20} />}
                title="Filter"
                onClick={
                  selectedIds.length >= 1
                    ? () => {
                        
                      }
                    : undefined
                }
                className={
                  selectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              /> */}
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
                onClick={handleDownloadPositions}
              />
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <PositionsTable
              hasLoaded={hasLoaded}
              loading={loading}
              positions={sortedRows}
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
              onShowCandidates={handleShowCandidates}
            />
          </div>
        </div>
      </div>
      {showFileViewer && fileViewerData && (
        <FileViewer
          fileUrl={fileViewerData.fileUrl}
          fileName={fileViewerData.fileName}
          onClose={() => { setShowFileViewer(false); setFileViewerData(null); }}
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
      {/* NEW: Position Candidates Modal */}
      <PositionCandidatesModal
        open={showCandidatesModal}
        onClose={() => setShowCandidatesModal(false)}
        positionName={selectedPosition?.name || ''}
        positionId={selectedPosition?.id || 0}
        candidates={positionCandidates}
        loading={loadingCandidates}
      />
    </>
  );
}