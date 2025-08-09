import { useState, useRef, forwardRef, useImperativeHandle } from "react";
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
    const [scopeTypeConfirmed, setScopeTypeConfirmed] = useState(!!scopeType);
    const [editingScopeType, setEditingScopeType] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    useImperativeHandle(ref, () => ({
      submitForm: () => {
        formRef.current?.requestSubmit();
      },
    }));

    // Validation state
    // const [showValidation, setShowValidation] = useState(false);

    // Validation for enabling the Save button
    const isFormValid =
      electionData.name.trim() !== "" &&
      electionData.startDate.trim() !== "" &&
      electionData.endDate.trim() !== "" &&
      electionData.description.trim() !== "";

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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid) {
        setShowValidation?.(true);
        return;
      }
      setShowValidation?.(false);
      // ...submit logic here...
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
            {/* Scope Type Input Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scope Type <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={scopeTypeInput}
                  onChange={(e) => setScopeTypeInput(e.target.value)}
                  disabled={scopeTypeConfirmed && !editingScopeType}
                  className={`w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] ${
                    scopeTypeConfirmed && !editingScopeType ? "bg-gray-100" : "bg-white"
                  }`}
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
                      className={`text-green-600 ${
                        scopeTypeInput ? "hover:text-green-800" : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={scopeTypeInput ? handleConfirmScopeType : undefined}
                      title="Confirm scope type"
                    />
                  )}
                </span>
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

