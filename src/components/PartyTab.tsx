import PartyTable from "@/components/PartyTable";
import { PartyModal } from "@/components/PartyModal";
import { useState } from "react";

interface Party {
  id: number;
  name: string;
  color: string;
}

interface PartyTabProps {
  parties: Party[];
  setParties: React.Dispatch<React.SetStateAction<Party[]>>;
  search: string;
  setSearch: (v: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  // Optional backend integration hooks
  remoteRows?: Party[];
  onSave?: (data: { partyName: string; selectedColor: string }) => Promise<void> | void;
  initialData?: { partyName: string; selectedColor: string } | null;
  onShowMembers?: (partyId: number, partyName: string) => void; // NEW: callback for showing members
}

export function PartyTab({
  parties = [],
  setParties,
  search,
  setSearch,
  showCreateModal,
  setShowCreateModal,
  selectedIds,
  setSelectedIds,
  remoteRows,
  onSave,
  initialData,
  onShowMembers, // NEW
}: PartyTabProps) {
  const [sortCol, setSortCol] = useState<keyof Party | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows: Party[] = remoteRows ?? parties;

  // Sorting logic
  const handleSort = (col: keyof Party) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedParties = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol] ?? "";
    const bVal = b[sortCol] ?? "";
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Checkbox logic (use parent state!)
  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Row click toggles checkbox
  const handleRowClick = (party: Party) => {
    handleCheckboxChange(party.id);
  };

  // Modal save logic (convert modal data to Party)
  const handlePartyModalSave = async (data: { partyName: string; selectedColor: string }) => {
    if (onSave) {
      await onSave(data);
      setShowCreateModal(false);
      return;
    }
    const newParty: Party = {
      id: Math.max(0, ...parties.map(p => p.id)) + 1,
      name: data.partyName,
      color: data.selectedColor,
    };
    setParties(prev => [...prev, newParty]);
    setShowCreateModal(false);
  };

  return (
    <>
      <PartyModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handlePartyModalSave}
        initialData={initialData ?? undefined}
      />
      <PartyTable
        parties={sortedParties}
        selectedIds={selectedIds}
        onCheckboxChange={handleCheckboxChange}
        onRowClick={handleRowClick}
        onShowMembers={onShowMembers} // NEW: pass through the callback
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        page={0}
        totalPages={0}
        onFirst={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
        onLast={() => {}}
        pageSize={10}
        onPageSizeChange={() => {}}
      />
    </>
  );
}