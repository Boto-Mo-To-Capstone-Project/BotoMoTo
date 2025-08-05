import { useState } from "react";
import { InputField } from "@/components/InputField";
import { MdCheck, MdEdit } from "react-icons/md";

interface ElectionFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface ElectionFormProps {
  electionData: ElectionFormData;
  setElectionData: React.Dispatch<React.SetStateAction<ElectionFormData>>;
  addParty: string;
  setAddParty: (v: "yes" | "no" | "") => void;
  scopeType: string;
  setScopeType: (v: string) => void;
  updateScopeTypeInTable: (v: string) => void; // <-- Add this prop to update all scope types in the table
}

export function ElectionForm({
  electionData,
  setElectionData,
  addParty,
  setAddParty,
  scopeType,
  setScopeType,
  updateScopeTypeInTable,
}: ElectionFormProps) {
  const [scopeTypeInput, setScopeTypeInput] = useState(scopeType || "");
  const [scopeTypeConfirmed, setScopeTypeConfirmed] = useState(!!scopeType);
  const [editingScopeType, setEditingScopeType] = useState(false);

  const handleConfirmScopeType = () => {
    setScopeType(scopeTypeInput);
    setScopeTypeConfirmed(true);
    setEditingScopeType(false);
    updateScopeTypeInTable(scopeTypeInput);
  };

  const handleEditScopeType = () => {
    setEditingScopeType(true);
    setScopeTypeConfirmed(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <InputField
            label="Election Name"
            type="text"
            value={electionData.name}
            onChange={(e) => setElectionData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your election name"
          />
        </div>
        <InputField
          label="Date Time (Begin)"
          type="datetime-local"
          value={electionData.startDate}
          onChange={(e) => setElectionData(prev => ({ ...prev, startDate: e.target.value }))}
        />
        <InputField
          label="Date Time (End)"
          type="datetime-local"
          value={electionData.endDate}
          onChange={(e) => setElectionData(prev => ({ ...prev, endDate: e.target.value }))}
        />
        {/* Scope Type Input Field (no dropdown, just input with icon) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scope Type <span className="text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={scopeTypeInput}
              onChange={e => setScopeTypeInput(e.target.value)}
              disabled={scopeTypeConfirmed && !editingScopeType}
              className={`w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] ${scopeTypeConfirmed && !editingScopeType ? "bg-gray-100" : "bg-white"}`}
              placeholder="Enter scope type"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              {scopeTypeConfirmed && !editingScopeType ? (
                <MdEdit
                  size={20}
                  className="text-gray-500 hover:text-[var(--color-primary)]"
                  onClick={handleEditScopeType}
                  title="Edit scope type"
                />
              ) : (
                <MdCheck
                  size={20}
                  className={`text-green-600 ${scopeTypeInput ? "hover:text-green-800" : "opacity-50 cursor-not-allowed"}`}
                  onClick={scopeTypeInput ? handleConfirmScopeType : undefined}
                  title="Confirm scope type"
                />
              )}
            </span>
          </div>
        </div>
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Party/Teams <span className="text-gray-400">(optional)</span>
          </label>
          <select
            value={addParty}
            onChange={e => setAddParty(e.target.value as "yes" | "no" | "")}
            className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
          >
            <option value="">Select an option</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div> */}
        <div className="lg:col-span-2">
          <InputField
            label="Election Description"
            textarea
            rows={4}
            value={electionData.description}
            onChange={(e) => setElectionData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter a description..."
          />
        </div>
      </div>
    </div>
  );
}

