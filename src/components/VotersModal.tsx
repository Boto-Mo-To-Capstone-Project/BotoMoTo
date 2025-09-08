import { useState, useEffect } from "react";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

type VotersModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    voterName: string;
    email: string;
    contactNumber: string;
    voterLimit: number;
    numberOfWinners: number;
    votingScopeId?: number | null; // NEW: optional scope id
  }) => void;
  initialData?: {
    voterName?: string;
    voterSurname?: string;
    voterFirstName?: string;
    voterMiddleInitial?: string;
    email?: string;
    contactNumber?: string;
    voterLimit?: number;
    numberOfWinners?: number;
    votingScopeId?: number | null; // NEW: selected scope id (edit mode)
  };
  disableSave?: boolean;
  title?: string;
  submitLabel?: string;
  votingScopes?: { id: number; name: string }[]; // NEW: available scopes to choose from
};

export function VotersModal({
  open,
  onClose,
  onSave,
  initialData = {
    voterName: "",
    email: "",
    contactNumber: "",
    voterLimit: 1,
    numberOfWinners: 1,
  },
  disableSave,
  title = "Voter Form",
  submitLabel = "Add",
  votingScopes,
}: VotersModalProps) {
  const [voterSurname, setVoterSurname] = useState(initialData.voterSurname || "");
  const [voterFirstName, setVoterFirstName] = useState(initialData.voterFirstName || "");
  const [voterMiddleInitial, setVoterMiddleInitial] = useState(initialData.voterMiddleInitial || "");
  const [email, setEmail] = useState(initialData.email || "");
  const [contactNumber, setContactNumber] = useState(initialData.contactNumber || "");
  const [voterLimit, setVoterLimit] = useState(initialData.voterLimit || 1);
  const [numberOfWinners, setNumberOfWinners] = useState(initialData.numberOfWinners || 1);
  // NEW: dynamic voting scope selection (optional)
  const [votingScopeId, setVotingScopeId] = useState<number | null | undefined>(
    initialData?.votingScopeId ?? undefined
  );

  // Batch upload state
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const templateUrl = "/assets/templates/voters_template.csv";

  useEffect(() => {
    if (!open) return;
    
    // Only update if we have actual initialData (edit mode)
    if (initialData && (initialData.voterSurname || initialData.voterFirstName || initialData.email)) {
      setVoterSurname(initialData.voterSurname || "");
      setVoterFirstName(initialData.voterFirstName || "");
      setVoterMiddleInitial(initialData.voterMiddleInitial || "");
      setEmail(initialData.email || "");
      setContactNumber(initialData.contactNumber || "");
      setVoterLimit(initialData.voterLimit || 1);
      setNumberOfWinners(initialData.numberOfWinners || 1);
      setVotingScopeId(initialData.votingScopeId ?? undefined);
    } else if (!initialData || (!initialData.voterSurname && !initialData.voterFirstName && !initialData.email)) {
      // Clear form for new entry mode
      setVoterSurname("");
      setVoterFirstName("");
      setVoterMiddleInitial("");
      setEmail("");
      setContactNumber("");
      setVoterLimit(1);
      setNumberOfWinners(1);
      setVotingScopeId(undefined);
    }
  }, [open, initialData?.voterSurname, initialData?.voterFirstName, initialData?.email, initialData?.votingScopeId]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {/* <p className="text-sm text-gray-500">
                Register and use this to manage all voters for the election.
              </p> */}
            </div>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          {/* Modal body */}
          <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                Add voters through this form or use the batch upload.
              </p>

            {/* Form */}
            {!showBatchUpload && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  onSave({
                    voterName: `${voterSurname} ${voterFirstName} ${voterMiddleInitial}`.trim(),
                    email,
                    contactNumber,
                    voterLimit,
                    numberOfWinners,
                    votingScopeId: votingScopeId ?? null,
                  });
                  onClose();
                }}
                className="grid gap-4 mb-4 grid-cols-2"
              >
                <div className="col-span-2">
                  <InputField
                    label="Surname*"
                    type="text"
                    value={voterSurname}
                    onChange={e => setVoterSurname(e.target.value)}
                    placeholder="Enter Surname"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <InputField
                    label="First Name*"
                    type="text"
                    value={voterFirstName}
                    onChange={e => setVoterFirstName(e.target.value)}
                    placeholder="Enter First Name"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <InputField
                    label="Middle Initial"
                    type="text"
                    value={voterMiddleInitial}
                    onChange={e => setVoterMiddleInitial(e.target.value)}
                    placeholder="Enter Middle Initial"
                  />
                </div>
                <div className="col-span-1">
                  <InputField
                    label="Email Address*"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <InputField
                    label="Contact Number"
                    type="text"
                    maxLength={11}
                    value={contactNumber}
                    onChange={e => {
                      // Accept only numbers and maximum 11 digits
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setContactNumber(val);
                    }}
                    onKeyDown={e => {
                      // Prevent typing non-numeric characters
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Enter Contact Number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                {/* NEW: Voting Scope selector (optional) */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voting Scope
                  </label>
                  <select
                    value={votingScopeId ?? ""}
                    onChange={e => {
                      const val = e.target.value;
                      setVotingScopeId(val === "" ? null : Number(val));
                    }}
                    className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  >
                    <option value="">All voters (no scope)</option>
                    {votingScopes?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Optional. Limit which group this voter belongs to.</p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <SubmitButton
                    type="button"
                    variant="action"
                    onClick={onClose}
                    label="Cancel"
                  />
                  <SubmitButton
                    type="submit"
                    variant="small"
                    label={submitLabel}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg" // Match the size of the Save button
                    isLoading={disableSave}
                  />
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}