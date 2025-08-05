"use client";
import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

interface ScopeModalProps {    
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    type: string;
    scopes: { name: string; description: string }[];
  }) => void;
  disableSave?: boolean;
}

export function ScopeModal({ open, onClose, onSave, disableSave }: ScopeModalProps) {
  const [scopeType, setScopeType] = useState("");
  const [scopeTypeConfirmed, setScopeTypeConfirmed] = useState(false);
  const [scopes, setScopes] = useState<{ name: string; description: string }[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Confirm scope type
  const handleConfirmType = () => {
    if (scopeType.trim()) setScopeTypeConfirmed(true);
  };

  // Edit scope type
  const handleEditType = () => {
    setScopeTypeConfirmed(false);
  };

  // Add or update scope entry
  const handleAddOrUpdate = () => {
    if (!name.trim()) return;
    if (editIndex !== null) {
      setScopes(scopes.map((s, i) => i === editIndex ? { name, description } : s));
      setEditIndex(null);
    } else {
      setScopes([...scopes, { name, description }]);
    }
    setName("");
    setDescription("");
  };

  // Edit an entry
  const handleEditScope = (idx: number) => {
    setEditIndex(idx);
    setName(scopes[idx].name);
    setDescription(scopes[idx].description);
  };

  // Remove an entry
  const handleRemoveScope = (idx: number) => {
    setScopes(scopes.filter((_, i) => i !== idx));
    if (editIndex === idx) {
      setEditIndex(null);
      setName("");
      setDescription("");
    }
  };

  // When scope type is edited, update all entries (if any)
  const handleScopeTypeChange = (val: string) => {
    setScopeType(val);
    // If you want to update all entries with new type, you can do it in parent onSave
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl relative px-4 sm:px-6 pt-8 pb-8 mx-2 sm:mx-4 text-center space-y-6 border border-gray-200 max-h-[90vh] overflow-visible break-words">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <AuthHeading title="Scope Form" subtitle="Set a scope type, then add scope names and descriptions." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ type: scopeType, scopes });
            onClose();
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          {/* Scope Type */}
          <div className="mb-4">
            <label className="font-medium block mb-1">Scoping Type</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full px-4 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-base"
                placeholder="Enter scoping type (e.g., Department)"
                value={scopeType}
                onChange={e => setScopeType(e.target.value)}
                readOnly={scopeTypeConfirmed}
                tabIndex={scopeTypeConfirmed ? -1 : 0}
                style={scopeTypeConfirmed ? { backgroundColor: "#f9fafb", cursor: "default" } : {}}
              />
              {scopeTypeConfirmed ? (
                <SubmitButton
                  label="Edit"
                  variant="small"
                  type="button"
                  onClick={handleEditType}
                />
              ) : (
                <SubmitButton
                  label="Confirm"
                  variant="small"
                  type="button"
                  onClick={handleConfirmType}
                />
              )}
            </div>
          </div>
          {/* Add/Edit Scope Entry */}
          {scopeTypeConfirmed && (
            <>
              {/* Scope Name */}
              <div className="mb-4">
                <label className="font-medium block mb-1">Scope Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-base"
                  placeholder="Enter scope name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              {/* Scope Description */}
              <div className="mb-8">
                <label className="font-medium block mb-1">Scope Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-base resize-none"
                  placeholder="Enter a description..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <SubmitButton label="Cancel" variant="small-action" type="button" onClick={onClose} />
            <SubmitButton
              label="Add"
              variant="small"
              type="button"
              onClick={() => {
                if (scopeTypeConfirmed && name.trim()) {
                  onSave({
                    type: scopeType,
                    scopes: [{ name, description }]
                  });
                  onClose();
                  setName("");
                  setDescription("");
                }
              }}
      
            />
          </div>
        </form>
      </div>
    </div>
  );
}