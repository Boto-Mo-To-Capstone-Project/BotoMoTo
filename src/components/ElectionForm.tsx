import { useRef, forwardRef, useImperativeHandle } from "react";
import { InputField } from "@/components/InputField";

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

interface ElectionFormProps {
  electionData: ElectionFormData;
  setElectionData: React.Dispatch<React.SetStateAction<ElectionFormData>>;
  addParty: string;
  setAddParty: (v: "yes" | "no" | "") => void;
  hideSaveButton?: boolean; // <-- Control save button visibility
  onSave?: () => void; // <-- Save button click handler
  showValidation?: boolean;
  setShowValidation?: (v: boolean) => void;
  isEditing?: boolean; // Add this to know if we're editing
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
      isEditing = false,
    },
    ref
  ) {
    const formRef = useRef<HTMLFormElement>(null);

    useImperativeHandle(ref, () => ({
      submitForm: () => {
        formRef.current?.requestSubmit();
      },
    }));

    // Determine what type of election this is
    const isInstance = !!(electionData.templateId && !electionData.isTemplate);
    const isTemplate = !!(electionData.isTemplate && !electionData.templateId);
    const isStandalone = !electionData.isTemplate && !electionData.templateId;
    
    // Show instance fields for templates (first instance) AND instances
    const showInstanceFields = isTemplate || isInstance;

    // Date validation helper functions
    const getDateValidationErrors = () => {
      const errors: { startDate?: string; endDate?: string } = {};
      
      if (electionData.startDate && electionData.endDate) {
        const startDate = new Date(electionData.startDate);
        const endDate = new Date(electionData.endDate);
        const now = new Date();
        
        // Check if start date is in the past (allow same day)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        
        if (startDateOnly < today) {
          errors.startDate = "Start date cannot be in the past";
        }
        
        // Check if start date is later than end date
        if (startDate >= endDate) {
          errors.startDate = "Start date must be before end date";
          errors.endDate = "End date must be after start date";
        }
      } else {
        // Individual field validation
        if (electionData.startDate) {
          const startDate = new Date(electionData.startDate);
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          
          if (startDateOnly < today) {
            errors.startDate = "Start date cannot be in the past";
          }
        }
      }
      
      return errors;
    };

    const dateErrors = getDateValidationErrors();
    const hasDateErrors = Object.keys(dateErrors).length > 0;

    // Validation for enabling the Save button
    const isFormValid = electionData.name.trim() !== "" &&
      electionData.description.trim() !== "" &&
      electionData.startDate.trim() !== "" &&
      electionData.endDate.trim() !== "" &&
      !hasDateErrors &&
      (!showInstanceFields || (
        electionData.instanceYear && electionData.instanceYear.trim() !== "" &&
        electionData.instanceName && electionData.instanceName.trim() !== ""
      ));

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
              {hasDateErrors ? (
                <div className="space-y-1">
                  <p>Please fix the following date validation errors:</p>
                  {dateErrors.startDate && <p>• {dateErrors.startDate}</p>}
                  {dateErrors.endDate && <p>• {dateErrors.endDate}</p>}
                </div>
              ) : (
                <p>Please fill out all required fields.</p>
              )}
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
                disabled={isInstance} // Instances inherit name from template
              />
              {isInstance && (
                <p className="text-xs text-gray-500 mt-1">
                  Name inherited from template. Cannot be changed.
                </p>
              )}
            </div>
            
            {/* Election Type Display/Selection */}
            <div className="lg:col-span-2">
              {isInstance ? (
                // Show read-only info for instances
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-blue-800">Election Instance</p>
                      <p className="text-sm text-blue-600">
                        This election is based on a repeating template
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Show checkbox for new/template elections
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isTemplate"
                      checked={electionData.isTemplate || false}
                      onChange={(e) =>
                        setElectionData((prev) => ({ 
                          ...prev, 
                          isTemplate: e.target.checked,
                          // Reset instance fields if unchecking
                          instanceYear: e.target.checked ? prev.instanceYear : "",
                          instanceName: e.target.checked ? prev.instanceName : ""
                        }))
                      }
                      className="h-4 w-4 text-[#8B0000] focus:ring-[#8B0000] border-gray-300 rounded"
                    />
                    <label htmlFor="isTemplate" className="text-sm font-medium text-gray-700">
                      Will this election repeat?
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 ml-7">
                    {electionData.isTemplate ? (
                      <div className="flex items-start space-x-1">
                        <span>✓</span>
                        <div>
                          <p>This will create a <strong>repeating election template</strong> that serves as the first instance.</p>
                          <p>You can create future instances (e.g., "Academic Year 2025", "Batch 2025") from this template.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span>
                          ✓ One-time election that won't repeat in the future.
                        </span>
                        
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date fields - required for all elections */}
            <InputField
              label="Date Time (Start)*"
              type="datetime-local"
              value={electionData.startDate}
              onChange={(e) =>
                setElectionData((prev) => ({ ...prev, startDate: e.target.value }))
              }
              required
              error={dateErrors.startDate}
            />
            <InputField
              label="Date Time (End)*"
              type="datetime-local"
              value={electionData.endDate}
              onChange={(e) =>
                setElectionData((prev) => ({ ...prev, endDate: e.target.value }))
              }
              required
              error={dateErrors.endDate}
            />

            {/* Instance details - show for templates (first instance) AND instances */}
            {showInstanceFields && (
              <>
                <InputField
                  label={isTemplate ? "First Instance Year*" : "Recurrence Year*"}
                  type="number"
                  value={electionData.instanceYear || ""}
                  onChange={(e) =>
                    setElectionData((prev) => ({ ...prev, instanceYear: e.target.value }))
                  }
                  placeholder="e.g., 2024"
                  required
                  min={new Date().getFullYear() - 10}
                  max={new Date().getFullYear() + 10}
                />
                <InputField
                  label={isTemplate ? "First Instance Name*" : "Recurrence Name*"}
                  type="text"
                  value={electionData.instanceName || ""}
                  onChange={(e) =>
                    setElectionData((prev) => ({ ...prev, instanceName: e.target.value }))
                  }
                  placeholder="e.g., Academic Year 2024, Batch 2024"
                  required
                />
                {isTemplate && (
                  <div className="lg:col-span-2">
                    <div className="text-xs text-gray-500 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <strong>Note:</strong> This template will also serve as your first election instance. 
                      The dates above will be used for this first instance.
                    </div>
                  </div>
                )}
              </>
            )}
            
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
                disabled={isInstance} // Instances inherit description from template
              />
              {isInstance && (
                <p className="text-xs text-gray-500 mt-1">
                  Description inherited from template. Cannot be changed.
                </p>
              )}
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
                {isTemplate 
                  ? 'Create Repeating Election' 
                  : isInstance 
                    ? 'Update Election Instance'
                    : 'Save Election'
                }
              </button>
            </div>
          )}
        </div>
      </form>
    );
  }
);

