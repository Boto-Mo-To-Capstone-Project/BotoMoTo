import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { InputField } from "@/components/InputField";
import { ScopeTypeSelect } from "@/components/ScopeTypeSelect";
import React, { useEffect } from "react";

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
  hideSaveButton?: boolean; // <-- New prop to control save button visibility
  onSave?: () => void; // <-- New prop for save button click handler
  showValidation?: boolean;
  setShowValidation?: (v: boolean) => void;
}

export interface ElectionFormHandle {
  submitForm: () => void;
}

export const ElectionForm = forwardRef<ElectionFormHandle, ElectionFormProps>(
  function ElectionForm(
    {
      electionData,
      setElectionData,
      addParty,
      setAddParty,
      scopeType,
      setScopeType,
      updateScopeTypeInTable,
      hideSaveButton,
      onSave,
      showValidation,
      setShowValidation,
    },
    ref
  ) {
    const [scopeTypeInput, setScopeTypeInput] = useState(scopeType || "");
    const formRef = useRef<HTMLFormElement>(null);

    // Sync local scope type UI state when prop changes (e.g., when editing existing election)
    useEffect(() => {
      setScopeTypeInput(scopeType || "");
    }, [scopeType]);

    useImperativeHandle(ref, () => ({
      submitForm: () => {
        formRef.current?.requestSubmit();
      },
    }));

    // Validation for enabling the Save button
    const isFormValid =
      electionData.name.trim() !== "" &&
      electionData.startDate.trim() !== "" &&
      electionData.endDate.trim() !== "" &&
      electionData.description.trim() !== "";

    const SCOPE_OPTIONS = [
      { label: "Area", value: "AREA" },
      { label: "Level", value: "LEVEL" },
      { label: "Department", value: "DEPARTMENT" },
    ];

    const toDisplay = (v?: string) => v ?? "";

    // Helper to map a free-text/label/value into enum + display label
    const applyScopeSelection = (inputLabel: string) => {
      const trimmed = (inputLabel || "").trim();
      if (!trimmed) {
        setScopeType("");
        updateScopeTypeInTable("");
        setScopeTypeInput("");
        return;
      }
      const match = SCOPE_OPTIONS.find(
        (o) =>
          o.value.toLowerCase() === trimmed.toLowerCase() ||
          o.label.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) {
        setScopeType(match.value); // enum
        updateScopeTypeInTable(match.label); // display
        setScopeTypeInput(match.label);
      } else {
        setScopeType("CUSTOM");
        updateScopeTypeInTable(trimmed);
        setScopeTypeInput(trimmed);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid) {
        setShowValidation?.(true);
        return;
      }
      setShowValidation?.(false);
      onSave?.();
    };

    return (
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="space-y-6">
          {showValidation && (
            <div className="text-red-600 text-sm mb-2">
              Please fill out all required fields.
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <InputField
                label="Election Name*"
                type="text"
                value={electionData.name}
                onChange={(e) =>
                  setElectionData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your election name"
                required
              />
            </div>
            <InputField
              label="Date Time (Begin)*"
              type="datetime-local"
              value={electionData.startDate}
              onChange={(e) =>
                setElectionData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              required
            />
            <InputField
              label="Date Time (End)*"
              type="datetime-local"
              value={electionData.endDate}
              onChange={(e) =>
                setElectionData((prev) => ({ ...prev, endDate: e.target.value }))
              }
              required
            />
            {/* Scope Type (typeable dropdown) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope Type <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <ScopeTypeSelect
                  classNamePrefix="scope-type"
                  placeholder="Select or type a scope type"
                  options={SCOPE_OPTIONS}
                  isClearable
                  value={scopeTypeInput ? { label: scopeTypeInput, value: scopeTypeInput } : null}
                  onChange={(opt: any) => {
                    if (!opt) {
                      applyScopeSelection("");
                      return;
                    }
                    const lbl = opt.label || opt.value || "";
                    applyScopeSelection(lbl);
                  }}
                  onCreateOption={(inputValue: string) => {
                    applyScopeSelection(inputValue);
                  }}
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <InputField
                label="Election Description*"
                textarea
                rows={4}
                value={electionData.description}
                onChange={(e) =>
                  setElectionData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter a description..."
                required
              />
            </div>
          </div>
          {/* Save Election button at the bottom */}
          {!hideSaveButton && (
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onSave}
                disabled={!isFormValid}
                className={`rounded-md px-6 py-2 text-white font-semibold transition ${
                  isFormValid
                    ? "bg-[#8B0000] hover:bg-[#a80000] cursor-pointer"
                    : "bg-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                Save Election
              </button>
            </div>
          )}
        </div>
      </form>
    );
  }
);

