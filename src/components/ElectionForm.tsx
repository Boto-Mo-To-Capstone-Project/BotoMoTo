import { useRef, forwardRef, useImperativeHandle } from "react";
import { InputField } from "@/components/InputField";

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
  hideSaveButton?: boolean; // <-- Control save button visibility
  onSave?: () => void; // <-- Save button click handler
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
      hideSaveButton,
      onSave,
      showValidation,
      setShowValidation,
    },
    ref
  ) {
    const formRef = useRef<HTMLFormElement>(null);

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

