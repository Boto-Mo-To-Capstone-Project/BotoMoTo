import ScopeTable from "@/components/ScopeTable";
import { ScopeModal } from "@/components/ScopeModal";
import { useState } from "react";

interface Scope {
  id: number;
  name: string;
  description: string;
}

export function ScopeTab({
  showCreateModal,
  setShowCreateModal,
  selectedIds,
  setSelectedIds,
  remoteRows,
  onSave,
  initialData,
}: {
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
  remoteRows?: Scope[];
  onSave?: (scopes: { name: string; description: string }[]) => Promise<void> | void;
  initialData?: { name: string; description: string } | null;
}) {
  const [sortCol, setSortCol] = useState<keyof Scope | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Use remote rows directly; legacy local scoping types/names removed
  const rows: Scope[] = remoteRows ?? [];

  // Sorting logic
  const handleSort = (col: keyof Scope) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedScopeTableData = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = (a as any)[sortCol] ?? "";
    const bVal = (b as any)[sortCol] ?? "";
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Checkbox logic
  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEditRowClick = (scope: { id: number }) => {
    handleCheckboxChange(scope.id);
  };

  const handleScopeModalSave = async (scopes: { name: string; description: string }[]) => {
    if (onSave) {
      await onSave(scopes);
      setShowCreateModal(false);
      return;
    }
    // No local fallback list anymore; rely on remote save
    setShowCreateModal(false);
  };

  return (
    <>
      <ScopeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleScopeModalSave}
        initialData={initialData ?? undefined}
      />
      <ScopeTable
        scopeData={sortedScopeTableData}
        selectedIds={selectedIds}
        onRowClick={handleEditRowClick}
        onCheckboxChange={handleCheckboxChange}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        page={0}
        totalPages={0}
        onFirst={() => { throw new Error("Function not implemented."); }}
        onPrev={() => { throw new Error("Function not implemented."); }}
        onNext={() => { throw new Error("Function not implemented."); }}
        onLast={() => { throw new Error("Function not implemented."); }}
        pageSize={0}
        onPageSizeChange={() => { throw new Error("Function not implemented."); }}
      />
    </>
  );
}