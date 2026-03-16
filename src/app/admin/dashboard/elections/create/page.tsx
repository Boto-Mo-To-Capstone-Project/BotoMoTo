"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SubmitButton } from "@/components/SubmitButton";
import SearchBar from '@/components/SearchBar';
import { MdAdd, MdDownload, MdDelete, MdEdit, MdSave } from "react-icons/md";
import { ElectionForm, ElectionFormHandle } from "@/components/ElectionForm";
import { ScopeTab } from "@/components/ScopeTab";
import { PartyTab } from "@/components/PartyTab"; // Use PartyTab instead of PartyTable/PartyModal
import { PartyCandidatesModal } from "@/components/PartyCandidatesModal"; // NEW: Import the modal
import toast, { Toaster } from 'react-hot-toast';
import { useElectionStatus } from '@/hooks/useElectionStatus';
import { ElectionStatusWarning } from '@/components/ElectionStatusWarning';

// Prefer API 'message' over 'error' object to avoid [object Object]
function getApiErrorMessage(json: any, fallback: string) {
  if (json && typeof json.message === 'string' && json.message) return json.message;
  if (json && typeof json.error === 'string' && json.error) return json.error;
  return fallback;
}

// Wrapper component that provides the Suspense boundary required by Next.js
export default function CreateElectionPage() {
  return (
    <Suspense fallback={<div className="w-full p-4 text-center text-gray-500">Loading…</div>}>
      <CreateElectionContent />
    </Suspense>
  );
}

type TabType = "election" | "scope" | "party";

interface ElectionFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isTemplate?: boolean;
  templateId?: number; // For instances created from templates
  instanceYear?: string;
  instanceName?: string;
}

interface ScopeRow {
  id: number;
  name: string;
  description: string;
}

interface PartyRow {
  id: number;
  name: string;
  color: string;
}

function CreateElectionContent() {
  const [activeTab, setActiveTab] = useState<TabType>("election");
  const [electionData, setElectionData] = useState<ElectionFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    isTemplate: false,
  });
  const [addParty, setAddParty] = useState<"yes" | "no" | "">(""); 
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  // PartyTab and ScopeTab remote state
  const [scopeRows, setScopeRows] = useState<ScopeRow[]>([]);
  const [parties, setParties] = useState<PartyRow[]>([]);

  const [scopeSelectedIds, setScopeSelectedIds] = useState<number[]>([]);
  const [partySelectedIds, setPartySelectedIds] = useState<number[]>([]);

  // For editing an existing scope/party
  const [scopeEditId, setScopeEditId] = useState<number | null>(null);
  const [partyEditId, setPartyEditId] = useState<number | null>(null);

  // NEW: Party candidates modal state
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<{ id: number; name: string } | null>(null);
  const [partyCandidates, setPartyCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const electionFormRef = useRef<ElectionFormHandle>(null);

  // Editing state
  const router = useRouter();
  const searchParams = useSearchParams();
  const eidParam = searchParams.get('eid');
  const editId = eidParam ? Number(eidParam) : null;
  const isEditing = !!editId && !Number.isNaN(editId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalMeta, setOriginalMeta] = useState<{ status?: "DRAFT" | "ACTIVE" | "CLOSED"; }>({});

  // Add election status check
  const { electionStatus, isEditingDisabled } = useElectionStatus(editId || 0);

  // Helper to format ISO -> datetime-local value
  const toDateTimeLocal = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => `${n}`.padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Load existing election meta, scopes, and parties when editing
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isEditing || !editId) return;
      try {
        setLoading(true);
        // Fetch election
        const res = await fetch(`/api/elections/${editId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to load election'));
        const e = json?.data?.election;
        if (!e) throw new Error('Election not found');
        const start = e?.schedule?.dateStart ?? null;
        const end = e?.schedule?.dateFinish ?? null;
        const nextData: ElectionFormData = {
          name: e.name || "",
          description: e.description || "",
          startDate: toDateTimeLocal(start),
          endDate: toDateTimeLocal(end),
          isTemplate: e.isTemplate || false,
          templateId: e.templateId || undefined, // Include templateId for instances
          instanceYear: e.instanceYear ? e.instanceYear.toString() : "",
          instanceName: e.instanceName || "",
        };
        if (!cancelled) {
          setElectionData(nextData);
          setOriginalMeta({ status: e.status });
        }
        // Fetch scopes and parties in parallel
        const [scopesRes, partiesRes] = await Promise.all([

          fetch(`/api/voting-scopes?electionId=${editId}&all=true`, { cache: 'no-store' }),
          fetch(`/api/parties?electionId=${editId}&all=true`, { cache: 'no-store' }),
        ]);
        const [scopesJson, partiesJson] = await Promise.all([scopesRes.json(), partiesRes.json()]);
        if (scopesRes.ok && scopesJson?.success) {
          const rows: ScopeRow[] = (scopesJson?.data?.votingScopes || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
          }));
          if (!cancelled) setScopeRows(rows);
        }
        if (partiesRes.ok && partiesJson?.success) {
          const rows: PartyRow[] = (partiesJson?.data?.parties || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }));
          if (!cancelled) setParties(rows);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast.error('Failed to load election details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isEditing, editId]);

  // Derived: filter scopes by search
  const filteredScopeRows = useMemo(() => {
    const q = (search || "").toLowerCase();
    if (!q) return scopeRows;
    return scopeRows.filter(r =>
      r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)
    );
  }, [scopeRows, search]);

  // Derived: filter parties by search
  const filteredPartyRows = useMemo(() => {
    const q = (search || "").toLowerCase();
    if (!q) return parties;
    return parties.filter(r =>
      r.name.toLowerCase().includes(q) || r.color.toLowerCase().includes(q)
    );
  }, [parties, search]);

  // Save handler for top Save button
  const handleSaveElection = () => {
    electionFormRef.current?.submitForm();
  };

  // Perform actual save (create or update)
  const handleFormSave = async () => {
    try {
      setSaving(true);
      const basePayload = {
        name: electionData.name.trim(),
        description: electionData.description.trim(),
        isTemplate: electionData.isTemplate || false,
      } as any;

      // For repeating elections (templates), include instance details
      if (electionData.isTemplate) {
        if (!electionData.instanceYear || !electionData.instanceName) {
          toast.error('Instance year and name are required for repeating elections');
          setSaving(false);
          return;
        }
        basePayload.instanceYear = parseInt(electionData.instanceYear);
        basePayload.instanceName = electionData.instanceName.trim();
      }

      // For instances, include template reference and instance details
      if (electionData.templateId) {
        basePayload.templateId = electionData.templateId;
        if (!electionData.instanceYear || !electionData.instanceName) {
          toast.error('Instance year and name are required for election instances');
          setSaving(false);
          return;
        }
        basePayload.instanceYear = parseInt(electionData.instanceYear);
        basePayload.instanceName = electionData.instanceName.trim();
      }

      // All elections need schedule data now
      const isoStart = electionData.startDate ? new Date(electionData.startDate).toISOString() : null;
      const isoEnd = electionData.endDate ? new Date(electionData.endDate).toISOString() : null;
      if (!isoStart || !isoEnd) {
        toast.error('Start and End date are required for all elections');
        setSaving(false);
        return;
      }
      basePayload.schedule = { dateStart: isoStart, dateFinish: isoEnd };

      let url = '/api/elections';
      let method: 'POST' | 'PUT' = 'POST';
      let successMsg = electionData.isTemplate 
        ? 'Repeating election created successfully' 
        : 'Election created successfully';

      if (isEditing && editId) {
        url = `/api/elections/${editId}`;
        method = 'PUT';
        successMsg = electionData.isTemplate 
          ? 'Repeating election updated successfully' 
          : 'Election updated successfully';
        // keep existing server-side meta fields
        basePayload.status = originalMeta.status ?? 'DRAFT';
      } else {
        basePayload.status = 'DRAFT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to save election'));

      // If newly created, navigate to edit mode for adding scopes/parties
      if (!isEditing) {
        const newId = json?.data?.election?.id;
        if (newId) {
          if (electionData.isTemplate) {
            toast.success('Template created. You can now add scopes and parties.');
          } else {
            toast.success('Election created. You can now add scopes and parties.');
          }
          router.push(`/admin/dashboard/elections/create?eid=${newId}`);
          return;
        }
      }

      // For updates, just show success message and stay on current page
      toast.success(successMsg);
    } catch (err) {
      console.error(err);
      toast.error((err as Error)?.message || 'Failed to save election');
    } finally {
      setSaving(false);
    }
  };

  const ensureHasElectionId = () => {
    if (!isEditing || !editId) {
      toast.error('Save the election first to manage scopes and parties.');
      return false;
    }
    return true;
  };

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

  // Download all scopes
  const handleDownloadScopes = () => {
    const headers = ['ID', 'Name', 'Description'];
    const filename = `scopes-${electionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(scopeRows, filename, headers);
    toast.success(`Downloaded ${scopeRows.length} scope(s)`);
  };

  // Download all parties
  const handleDownloadParties = () => {
    const headers = ['ID', 'Name', 'Color'];
    const filename = `parties-${electionData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(parties, filename, headers);
    toast.success(`Downloaded ${parties.length} party(ies)`);
  };

  // Scope actions
  const openCreateScopeModal = () => {
    if (!ensureHasElectionId()) return;
    setScopeEditId(null);
    setShowCreateModal(true);
  };

  const openEditScopeModal = () => {
    if (!ensureHasElectionId()) return;
    if (scopeSelectedIds.length !== 1) return;
    setScopeEditId(scopeSelectedIds[0]);
    setShowCreateModal(true);
  };

  const handleSaveScopeFromModal = async (scopes: { name: string; description: string }[]) => {
    if (!ensureHasElectionId()) return;
    try {
      if (scopeEditId) {
        // Update single scope (use first entry)
        const body = {
          name: scopes[0]?.name ?? '',
          description: scopes[0]?.description ?? '',
        };
        const res = await fetch(`/api/voting-scopes/${scopeEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to update scope'));
        toast.success('Scope updated');
      } else {
        // Create one or multiple scopes
        for (const s of scopes) {
          const res = await fetch('/api/voting-scopes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              electionId: editId,
              name: s.name,
              description: s.description,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to create scope'));
        }
        toast.success('Scope(s) saved');
      }
      // Refresh
      const res = await fetch(`/api/voting-scopes?electionId=${editId}&all=true`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success) {
        const rows: ScopeRow[] = (json?.data?.votingScopes || []).map((s: any) => ({ id: s.id, name: s.name, description: s.description }));
        setScopeRows(rows);
        setScopeSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message || 'Failed to save scope');
    }
  };

  const handleDeleteSelectedScopes = async () => {
    if (!ensureHasElectionId()) return;
    if (scopeSelectedIds.length < 1) return;
    try {
      await Promise.all(scopeSelectedIds.map(async (id) => {
        const res = await fetch(`/api/voting-scopes/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to delete scope'));
      }));
      toast.success('Selected scope(s) deleted');
      // Refresh
      const res = await fetch(`/api/voting-scopes?electionId=${editId}&all=true`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success) {
        const rows: ScopeRow[] = (json?.data?.votingScopes || []).map((s: any) => ({ id: s.id, name: s.name, description: s.description }));
        setScopeRows(rows);
      }
      setScopeSelectedIds([]);
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message || 'Failed to delete scope(s)');
    }
  };

  // Party actions
  const openCreatePartyModal = () => {
    if (!ensureHasElectionId()) return;
    setPartyEditId(null);
    setShowPartyModal(true);
  };

  const openEditPartyModal = () => {
    if (!ensureHasElectionId()) return;
    if (partySelectedIds.length !== 1) return;
    setPartyEditId(partySelectedIds[0]);
    setShowPartyModal(true);
  };

  const handleSavePartyFromModal = async (data: { partyName: string; selectedColor: string }) => {
    if (!ensureHasElectionId()) return;
    try {
      if (partyEditId) {
        const body = { name: data.partyName, color: data.selectedColor };
        const res = await fetch(`/api/parties/${partyEditId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to update party'));
        toast.success('Party updated');
      } else {
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ electionId: editId, name: data.partyName, color: data.selectedColor }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to create party'));
        toast.success('Party saved');
      }
      // Refresh
      const res = await fetch(`/api/parties?electionId=${editId}&all=true`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success) {
        const rows: PartyRow[] = (json?.data?.parties || []).map((p: any) => ({ id: p.id, name: p.name, color: p.color }));
        setParties(rows);
        setPartySelectedIds([]);
      }
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message || 'Failed to save party');
    }
  };

  // NEW: Handler for showing party candidates
  const handleShowMembers = async (partyId: number, partyName: string) => {
    if (!ensureHasElectionId()) return;
    
    setSelectedParty({ id: partyId, name: partyName });
    setShowCandidatesModal(true);
    setLoadingCandidates(true);
    
    try {
      // Fetch candidates for this party in this election
      const response = await fetch(`/api/candidates?electionId=${editId}&partyId=${partyId}`);
      const result = await response.json();
      
      if (result.success) {
        // Map API candidates to modal format
        const mapped = (result.data?.candidates || []).map((c: any) => ({
          id: c.id,
          name: `${c.voter?.firstName || ""} ${c.voter?.lastName || ""}`.trim() || "—",
          email: c.voter?.email || "",
          position: c.position?.name || "",
        }));
        setPartyCandidates(mapped);
      } else {
        setPartyCandidates([]);
        toast.error(result.message || 'Failed to fetch party candidates');
      }
    } catch (error) {
      console.error('Error fetching party candidates:', error);
      setPartyCandidates([]);
      toast.error('Failed to fetch party candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleDeleteSelectedParties = async () => {
    if (!ensureHasElectionId()) return;
    if (partySelectedIds.length < 1) return;
    try {
      await Promise.all(partySelectedIds.map(async (id) => {
        const res = await fetch(`/api/parties/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(getApiErrorMessage(json, 'Failed to delete party'));
      }));
      toast.success('Selected party(ies) deleted');
      // Refresh
      const res = await fetch(`/api/parties?electionId=${editId}&all=true`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json?.success) {
        const rows: PartyRow[] = (json?.data?.parties || []).map((p: any) => ({ id: p.id, name: p.name, color: p.color }));
        setParties(rows);
      }
      setPartySelectedIds([]);
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message || 'Failed to delete party(ies)');
    }
  };

  // Check if tabs should be enabled
  const isScopeTabEnabled = isEditing;
  const isPartyTabEnabled = isEditing;

  // Auto-switch to Election tab if current tab becomes disabled
  useEffect(() => {
    if (activeTab === "scope" && !isScopeTabEnabled) {
      setActiveTab("election");
    }
    if (activeTab === "party" && !isPartyTabEnabled) {
      setActiveTab("election");
    }
  }, [activeTab, isScopeTabEnabled, isPartyTabEnabled]);

  const tabOptions = [
    { label: "Election", value: "election", disabled: false },
    { label: "Scope", value: "scope", disabled: !isScopeTabEnabled },
    { label: "Party", value: "party", disabled: !isPartyTabEnabled },
  ];

  const scopeInitialData = useMemo(() => {
    if (!scopeEditId) return null;
    const row = scopeRows.find(r => r.id === scopeEditId);
    if (!row) return null;
    return { name: row.name, description: row.description };
  }, [scopeEditId, scopeRows]);

  const partyInitialData = useMemo(() => {
    if (!partyEditId) return null;
    const row = parties.find(r => r.id === partyEditId);
    if (!row) return null;
    return { partyName: row.name, selectedColor: row.color };
  }, [partyEditId, parties]);

  const renderContent = () => {
    switch (activeTab) {
      case "election":
        return (
          <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
            <ElectionForm
              ref={electionFormRef}
              electionData={electionData}
              setElectionData={setElectionData}
              addParty={addParty}
              setAddParty={setAddParty}
              hideSaveButton
              onSave={handleFormSave}
            />
          </div>
        );
      case "scope":
        return (
          <ScopeTab
            showCreateModal={showCreateModal}
            setShowCreateModal={(v) => {
              if (!v) setScopeEditId(null);
              setShowCreateModal(v);
            }}
            selectedIds={scopeSelectedIds}
            setSelectedIds={setScopeSelectedIds}
            remoteRows={filteredScopeRows}
            onSave={handleSaveScopeFromModal}
            initialData={scopeInitialData}
          />
        );
      case "party":
        return (
          <PartyTab
            parties={parties}
            setParties={setParties}
            search={search}
            setSearch={setSearch}
            showCreateModal={showPartyModal}
            setShowCreateModal={(v) => {
              if (!v) setPartyEditId(null);
              setShowPartyModal(v);
            }}
            selectedIds={partySelectedIds}
            setSelectedIds={setPartySelectedIds}
            remoteRows={filteredPartyRows}
            onSave={handleSavePartyFromModal}
            initialData={partyInitialData}
            onShowMembers={handleShowMembers} // NEW: Add the handler
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      {/*<Toaster position="top-center" />*/}
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
        {/* Tabs + Toolbar at the top */}
        <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
          <div className="flex-shrink-0">
            <div className="inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white">
              {tabOptions.map((tab, i) => (
                <SubmitButton
                  key={tab.value}
                  label={tab.label}
                  variant="tab"
                  isActive={activeTab === tab.value}
                  onClick={() => !tab.disabled && setActiveTab(tab.value as TabType)}
                  className={`w-full h-[44px] md:w-[120px] md:h-10 ${
                    i !== 0 ? "border-l border-gray-200" : ""
                  } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              ))}
            </div>
          </div>
          {/* Election Save Button right aligned at the top */}
          {activeTab === "election" && (
            <div className="flex-1 flex justify-end gap-2">
              {loading ? (
                <div className="flex gap-2">
                  <div className="h-10 w-[100px] bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-[100px] bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              ) : (
                <>
                  {/* Cancel Button - always clickable */}
                  <SubmitButton
                    label="Cancel"
                    variant="action"
                    onClick={() => {
                      router.push('/admin/dashboard/elections');
                    }}
                    className="min-w-[100px]"
                  />
                  {/* Save/Update Button - can be disabled */}
                  <div className={`${
                    isEditing && isEditingDisabled 
                      ? 'opacity-50 pointer-events-none' 
                      : ''
                  }`}>
                    <SubmitButton
                      label={isEditing ? "Update" : "Save"}
                      variant="action-primary"
                      icon={<MdSave size={20} className="fill-current" />}
                      title={isEditing ? "Update" : "Save"}
                      onClick={handleSaveElection} // <-- This triggers the form's submit
                      className={`min-w-[100px] ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === "scope" && (
            <>
              {/* Search bar */}
              <div className="flex-1 md:mx-4">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for Scope"
                />
              </div>
              {/* Action Buttons */}
              {loading ? (
                // Skeleton loading for scope action buttons
                <div className="flex-shrink-0 flex gap-2">
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              ) : (
                <div className={`flex-shrink-0 flex gap-2 ${isEditingDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <SubmitButton
                    label=""
                    variant="action"
                    icon={<MdAdd size={20} />}
                    title="Add"
                    onClick={openCreateScopeModal}
                  />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdEdit size={20} />}
                  title="Edit"
                  onClick={scopeSelectedIds.length === 1 ? openEditScopeModal : undefined}
                  className={scopeSelectedIds.length === 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"}
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDelete size={20} />}
                  title="Delete"
                  onClick={
                    scopeSelectedIds.length >= 1
                    ? handleDeleteSelectedScopes
                    : undefined
                  }
                  className={
                    scopeSelectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDownload size={20} />}
                  title="Download"
                  onClick={
                      handleDownloadScopes
                  }
                />
                {/* Removed Save button: changes are persisted immediately via modal */}
              </div>
              )}
            </>
          )}
          {/* Party Toolbar */}
          {activeTab === "party" && (
            <>
              <div className="flex-1 md:mx-4">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for Party"
                />
              </div>
              {loading ? (
                // Skeleton loading for party action buttons
                <div className="flex-shrink-0 flex gap-2">
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-md animate-pulse"></div>
                </div>
              ) : (
                <div className={`flex-shrink-0 flex gap-2 ${isEditingDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <SubmitButton
                    label=""
                    variant="action"
                    icon={<MdAdd size={20} />}
                    title="Add"
                    onClick={openCreatePartyModal}
                  />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdEdit size={20} />}
                  title="Edit"
                  onClick={
                    partySelectedIds.length === 1
                      ? openEditPartyModal
                      : undefined
                  }
                  className={
                    partySelectedIds.length === 1
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
                    partySelectedIds.length >= 1
                      ? handleDeleteSelectedParties
                      : undefined
                  }
                  className={
                    partySelectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDownload size={20} />}
                  title="Download"
                  onClick={
                    handleDownloadParties
                  }
                />
                {/* Removed Save button: changes are persisted immediately via modal */}
              </div>
              )}
            </>
          )}
        </div>

        {/* Election Status Warning */}
        {isEditing && <ElectionStatusWarning electionStatus={electionStatus} context="election configurations" />}

        {/* Election form title and description only for Election tab */}
        {activeTab === "election" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">
              {isEditing 
                ? (electionData.isTemplate ? 'Edit repeating election' : 'Edit election')
                : (electionData.isTemplate ? 'Create repeating election' : 'Create election')
              }
            </h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              {isEditing 
                ? 'Update the fields and click Update to save changes.'
                : (electionData.isTemplate 
                  ? 'Fill out the necessary fields to create a repeating election.'
                  : 'Fill out the necessary fields to create a new election for your organization.'
                )
              }
            </p>
          </>
        )}
        {/* Variant: Scope tab */}
        {activeTab === "scope" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">Scope</h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              Step 1: Click 'Add Scope' Set eligibility rules or levels for voting, such as limiting access based on voter level (e.g., Level 1, 2, 3).
            </p>
          </>
        )}

        {/* Variant: Party tab */}
        {activeTab === "party" && (
          <>
            <h2 className="text-lg font-semibold mb-4 px-2 sm:px-5">Party</h2>
            <p className="text-gray-600 mb-4 px-2 sm:px-5">
              Step 2: Click 'Add Party' to create a new political party or group.
            </p>
          </>
        )}

        {/* Card/Form */}
        <div className={`main-content flex-auto overflow-auto pb-3 px-2 sm:px-5 ${isEditingDisabled ? 'pointer-events-none opacity-60' : ''}`}>
          {loading && isEditing ? (
            <div className="w-full p-4 text-center text-gray-500">Loading election…</div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* NEW: Party Candidates Modal */}
      {showCandidatesModal && selectedParty && (
        <PartyCandidatesModal
          open={showCandidatesModal}
          onClose={() => {
            setShowCandidatesModal(false);
            setSelectedParty(null);
            setPartyCandidates([]);
          }}
          partyName={selectedParty.name}
          partyId={selectedParty.id}
          candidates={partyCandidates}
          loading={loadingCandidates}
        />
      )}
    </div>
  );
}
