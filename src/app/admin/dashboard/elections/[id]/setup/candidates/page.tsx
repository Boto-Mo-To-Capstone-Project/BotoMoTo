"use client";
import { useState, useEffect, useRef } from 'react';
import { MdAdd, MdFilterList, MdDelete, MdEdit, MdSave, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import CandidatesTable from '@/components/CandidatesTable';
import { CandidatesModal } from "@/components/CandidatesModal";
import { DragandDropdown } from "@/components/CandidatesDragandDrop";
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

export default function CandidatesDashboardPage() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortCol, setSortCol] = useState<"name" | "position" | "partylist" | "email" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(null);
  const [editInitialData, setEditInitialData] = useState<any>(undefined);

  // Data state from API
  const [candidates, setCandidates] = useState<Array<{
    id: number;
    name: string;
    position: string;
    partylist: string;
    email: string;
  }>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
  const handleSort = (col: "name" | "position" | "partylist" | "email") => {
    // Map frontend column names to API column names
    const colMapping: { [key: string]: string } = {
      name: "lastName",
      position: "position",
      partylist: "party", 
      email: "email"
    };
    
    const apiCol = colMapping[col] || col;
    
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

  // Add candidate: POST /api/candidates
  const handleSaveCandidate = async (formData: FormData) => {
    try {
      setModalLoading(true);
      
      const res = await fetch('/api/candidates', {
        method: 'POST',
        body: formData, // FormData already prepared by modal
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || (json as any)?.success === false) {
        toast.error((json as any)?.message || 'Failed to create candidate');
        return;
      }

      toast.success('Candidate created successfully');
      setShowCandidatesModal(false);
      setReloadKey((k) => k + 1);
      setPage(1); // Go to first page to see new candidate
    } catch (e) {
      console.error('Create candidate error:', e);
      toast.error('Failed to create candidate');
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk delete selected candidates -> POST /api/candidates/bulk { operation: 'soft_delete', candidateIds, electionId }
  const handleDeleteSelected = async () => {
    if (selectedIds.length < 1) return;
    
    const plural = selectedIds.length > 1 ? 'candidates' : 'candidate';
    if (!window.confirm(`Delete ${selectedIds.length} ${plural}? This will soft-delete them.`)) return;

    try {
      setModalLoading(true);
      
      const res = await fetch('/api/candidates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'soft_delete',
          candidateIds: selectedIds,
          electionId
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || (json as any)?.success === false) {
        toast.error((json as any)?.message || 'Failed to delete candidates');
        return;
      }

      const deletedCount = selectedIds.length;
      toast.success(`Successfully deleted ${deletedCount} candidate${deletedCount === 1 ? '' : 's'}`);

      setCandidates((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Bulk delete candidates error:', e);
      toast.error('Failed to delete candidates');
    } finally {
      setModalLoading(false);
    }
  };

  // Edit candidate: prefill modal from GET /api/candidates/[id] and submit via PUT
  const openEditModal = async () => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    setIsEditMode(true);
    setEditingCandidateId(id);

    try {
      setModalLoading(true);
      const res = await fetch(`/api/candidates/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (json as any)?.success === false || !(json as any)?.data?.candidate) {
        toast.error((json as any)?.message || 'Failed to load candidate');
        setIsEditMode(false);
        setEditingCandidateId(null);
        return;
      }

      const c = (json as any).data.candidate as any;
      // Map API data to modal format
      const initial = {
        voterId: c.voter?.id,
        positionId: c.position?.id,
        partyId: c.party?.id ?? null,
        isNew: c.isNew,
        imageUrl: c.imageUrl ?? null,
        credentialUrl: c.credentialUrl ?? null,
      };
      setEditInitialData(initial);
      setShowCandidatesModal(true);
    } catch (e) {
      console.error('Load candidate error:', e);
      toast.error('Failed to load candidate');
      setIsEditMode(false);
      setEditingCandidateId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditCandidateSave = async (data: any) => {
    if (!isEditMode || !editingCandidateId) return;
    try {
      setModalLoading(true);

      // Whitelist only updatable fields
      const payload: any = {
        positionId: data.positionId,
        isNew: data.isNew,
      };
      if (data.partyId !== undefined) payload.partyId = data.partyId;
      if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl;
      if (data.credentialUrl !== undefined) payload.credentialUrl = data.credentialUrl;

      const res = await fetch(`/api/candidates/${editingCandidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || (json as any)?.success === false) {
        toast.error((json as any)?.message || 'Failed to update candidate');
        return;
      }

      toast.success('Candidate updated successfully');
      setShowCandidatesModal(false);
      setIsEditMode(false);
      setEditingCandidateId(null);
      setEditInitialData(undefined);
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error('Update candidate error:', e);
      toast.error('Failed to update candidate');
    } finally {
      setModalLoading(false);
    }
  };

  // Import candidates: POST /api/candidates/bulk with operation: "bulk_create"
  const handleImportCandidates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setModalLoading(true);
      
      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have header and at least one data row');
        return;
      }

      // Parse CSV and create candidates array
      const candidatesData = [] as any[];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          candidatesData.push({
            voterId: parseInt(values[0]) || null,
            positionId: parseInt(values[1]) || null,
            partyId: parseInt(values[2]) || null,
            isNew: values[3] === 'true' || false,
            imageUrl: values[4] || null,
            bio: values[5] || null,
          });
        }
      }

      if (candidatesData.length === 0) {
        toast.error('No valid candidates found in CSV file');
        return;
      }

      const res = await fetch('/api/candidates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'bulk_create',
          electionId,
          candidates: candidatesData,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || (json as any)?.success === false) {
        toast.error((json as any)?.message || 'Failed to import candidates');
        return;
      }

      toast.success(`Successfully imported ${candidatesData.length} candidate${candidatesData.length === 1 ? '' : 's'}`);
      setShowImportModal(false);
      setReloadKey((k) => k + 1);
      setPage(1);
    } catch (e) {
      console.error('Import candidates error:', e);
      toast.error('Failed to import candidates');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch candidates from API
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    const run = async () => {
      try {
        // Map frontend column names to API column names
        const colMapping: { [key: string]: string } = {
          name: "lastName",
          position: "position",
          partylist: "party", 
          email: "email"
        };
        
        const apiSortCol = sortCol ? colMapping[sortCol] || sortCol : null;
        
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(apiSortCol ? { sortCol: apiSortCol, sortDir: sortDir } : {}),
        });
        const res = await fetch(`/api/candidates?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || (json as any)?.success === false) {
          console.error("Failed to load candidates:", (json as any)?.message || res.statusText);
          return;
        }

        // Map API candidate -> table row
        const mapped = ((json as any).data?.candidates || []).map((c: any) => ({
          id: c.id,
          name: `${c.voter?.firstName || ""} ${c.voter?.lastName || ""}`.trim() || "—",
          position: c.position?.name || "—",
          partylist: c.party?.name || "—",
          department: c.voter?.votingScope?.name || "—",
          email: c.voter?.email || "—",
        }));

        setCandidates(mapped);
        setTotalPages((json as any).data?.pagination?.totalPages || 1);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Candidates fetch error:", e);
        }
      }
    };

    run();
    return () => ctrl.abort();
  }, [electionId, page, pageSize, debouncedSearch, sortCol, sortDir, reloadKey]);

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            {/* Tabs */}
            <div className="flex-shrink-0"></div>
            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for Candidates"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
              <SubmitButton
                label=""
                variant="action"
                icon={<MdAdd size={20} />}
                title="Add"
                onClick={() => { setIsEditMode(false); setEditInitialData(undefined); setShowCandidatesModal(true); }}
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
                    ? () => { /* TODO: handle filter */ }
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
            <CandidatesTable
              candidates={candidates}
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
              onRowClick={(candidate) => handleCheckboxChange(candidate.id)}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
      </div>
      {/* Toaster for notifications */}
      {/*<Toaster position="top-center" />*/}
      {/* Candidates Modal */}
      <CandidatesModal
        open={showCandidatesModal}
        onClose={() => { setShowCandidatesModal(false); setIsEditMode(false); setEditingCandidateId(null); setEditInitialData(undefined); }}
        onSave={isEditMode ? handleEditCandidateSave as any : handleSaveCandidate}
        electionId={electionId}
        disableSave={modalLoading}
        isEditMode={isEditMode}
        initialData={isEditMode ? editInitialData : undefined}
      />
      {/* Import Candidates Modal */}
      <DragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Candidates"
        description="Drag and drop your candidates CSV file here, or click to select."
        accept=".csv"
        onChange={handleImportCandidates}
        fileTypeText="Accepted file type: .csv"
        id="import-candidates-file"
        maxSizeMB={5}
      />
    </>
  );
}