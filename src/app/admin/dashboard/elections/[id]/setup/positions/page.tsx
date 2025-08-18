"use client";
import { useState, useEffect, useRef } from 'react';
import { MdAdd, MdFilterList, MdDelete, MdEdit, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import PositionsTable from '@/components/PositionsTable';
import { PositionsModal } from '@/components/PositionsModal';
import { DragandDropdown } from '@/components/PositionsDragandDrop';
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from 'react-hot-toast';

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

  // Edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null);
  const [editInitialData, setEditInitialData] = useState<any>(undefined);

  // Data state from API
  const [rows, setRows] = useState<Array<{
    id: number;
    position: string;
    voteLimit: number;
    numberOfWinners: number;
    scopeName: string;
    order: number;
  }>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // NEW: voting scopes for the election
  const [votingScopes, setVotingScopes] = useState<Array<{ id: number; name: string }>>([]);

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
      };
      if (typeof data.votingScopeId === 'number') {
        payload.votingScopeId = data.votingScopeId;
      }

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
  const handleDeleteSelected = async () => {
    if (selectedIds.length < 1) return;
    
    const plural = selectedIds.length > 1 ? 'positions' : 'position';
    if (!window.confirm(`Delete ${selectedIds.length} ${plural}? This will soft-delete them.`)) return;

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
      };
      if (typeof data.votingScopeId === 'number') {
        payload.votingScopeId = data.votingScopeId;
      }

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
  const handleImportPositions = async (file: File) => {
    try {
      setModalLoading(true);
      
      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have header and at least one data row');
        return;
      }

      // Assume CSV format: position,voteLimit,numberOfWinners
      const header = lines[0].toLowerCase();
      const expectedFields = ['position', 'voteLimit', 'numberOfWinners'];
      const hasExpectedFields = expectedFields.every(field => 
        header.includes(field.toLowerCase())
      );

      if (!hasExpectedFields) {
        toast.error('CSV must have columns: position, voteLimit, numberOfWinners');
        return;
      }

      const positions = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          positions.push({
            name: values[0],
            voteLimit: parseInt(values[1]) || 1,
            numOfWinners: parseInt(values[2]) || 1,
            electionId,
            isActive: true,
          });
        }
      }

      if (positions.length === 0) {
        toast.error('No valid positions found in CSV file');
        return;
      }

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

      toast.success(`Successfully imported ${positions.length} position${positions.length === 1 ? '' : 's'}`);
      setShowImportModal(false);
      setReloadKey((k) => k + 1);
      setPage(1);
    } catch (e) {
      console.error('Import positions error:', e);
      toast.error('Failed to import positions');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch positions from API
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    const run = async () => {
      try {
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(sortCol ? { sortCol: sortCol, sortDir: sortDir } : {}),
        });
        const res = await fetch(`/api/positions?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          console.error("Failed to load positions:", json?.message || res.statusText);
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

        setRows(mapped);
        setTotalPages(json.data?.pagination?.totalPages || 1);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Positions fetch error:", e);
        }
      }
    };

    run();
    return () => ctrl.abort();
  }, [electionId, page, pageSize, debouncedSearch, sortCol, sortDir, reloadKey]);

  // NEW: Fetch voting scopes for this election (for the modal select)
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;
    const ctrl = new AbortController();
    const loadScopes = async () => {
      try {
        const res = await fetch(`/api/voting-scopes?electionId=${electionId}`, { signal: ctrl.signal });
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

  return (
    <>
      <Toaster position="top-center" />
      <PositionsModal
        open={showModal}
        onClose={() => { 
          setShowModal(false); 
          setIsEditMode(false); 
          setEditingPositionId(null); 
          setEditInitialData(undefined); 
        }}
        onSave={isEditMode ? handleEditPositionSave : handleSavePosition}
        initialData={editInitialData}
        title={isEditMode ? "Edit Position" : "Position Form"}
        submitLabel={isEditMode ? "Save" : "Add"}
        disableSave={modalLoading}
        votingScopes={votingScopes}
      />
      {/* Import Positions Modal */}
      <DragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Positions"
        description="Drag and drop your positions CSV file here, or click to select."
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportPositions(file);
        }}
        fileTypeText="Accepted file type: .csv"
        id="import-positions-file"
        maxSizeMB={5}
      />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
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
                  setEditInitialData(undefined); 
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
              <SubmitButton
                label=""
                variant="action"
                icon={<MdFilterList size={20} />}
                title="Filter"
                onClick={
                  selectedIds.length >= 1
                    ? () => {
                        /* TODO: handle filter */
                      }
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

            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <PositionsTable
              positions={rows}
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
    </>
  );
}