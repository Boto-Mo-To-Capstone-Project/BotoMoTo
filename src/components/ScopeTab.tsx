import ScopeTable from "@/components/ScopeTable";
import { ScopeModal } from "@/components/ScopeModal";
import { useState } from "react";

interface Scope {
  id: number;
  type: string;
  name: string;
  description: string;
}

interface ScopeTabProps {
  scopingType: string;
  setScopingType: (v: string) => void;
  scopingNames: { name: string; description: string }[];
  setScopingNames: React.Dispatch<React.SetStateAction<{ name: string; description: string }[]>>;
  search: string;
  setSearch: (v: string) => void;
}

export function ScopeTab({
  scopingType,
  setScopingType,
  scopingNames = [],
  setScopingNames,
  search,
  setSearch,
  showCreateModal,
  setShowCreateModal,
  selectedIds,
  setSelectedIds,
}: ScopeTabProps & {
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  selectedIds: number[];
  setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>;
}) {
  const [sortCol, setSortCol] = useState<keyof Scope | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Build table data from scopingNames
  const scopeTableData = scopingNames.map((item, idx) => ({
    id: idx,
    type: scopingType,
    name: item.name,
    description: item.description,
  }));

  // Sorting logic
  const handleSort = (col: keyof Scope) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedScopeTableData = [...scopeTableData].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol] ?? "";
    const bVal = b[sortCol] ?? "";
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

  const handleScopeModalSave = (data: { type: string; scopes: { name: string; description: string }[] }) => {
    setScopingType(data.type);
    setScopingNames(prev => [...prev, ...data.scopes]);
    setShowCreateModal(false);
  };

  return (
    <>
      <ScopeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleScopeModalSave}
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