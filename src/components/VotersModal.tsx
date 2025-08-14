import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import { FiDownload } from "react-icons/fi";
import { FileDropzone } from "@/components/FileDropzone";
import { UploadedFileDisplay } from "@/components/UploadedFileDisplay";

type VotersModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    voterName: string;
    scope: string;
    email: string;
    contactNumber: string;
    voterLimit: number;
    numberOfWinners: number;
  }) => void;
  initialData?: {
    voterName?: string;
    scope?: string;
    email?: string;
    contactNumber?: string;
    voterLimit?: number;
    numberOfWinners?: number;
  };
  disableSave?: boolean;
};

export function VotersModal({
  open,
  onClose,
  onSave,
  initialData = {
    voterName: "",
    scope: "Department 1",
    email: "",
    contactNumber: "",
    voterLimit: 1,
    numberOfWinners: 1,
  },
  disableSave,
}: VotersModalProps) {
  const [voterSurname, setVoterSurname] = useState("");
  const [voterFirstName, setVoterFirstName] = useState("");
  const [voterMiddleInitial, setVoterMiddleInitial] = useState("");
  const [scope, setScope] = useState(initialData.scope || "Department 1");
  const [email, setEmail] = useState(initialData.email || "");
  const [contactNumber, setContactNumber] = useState(initialData.contactNumber || "");
  const [voterLimit, setVoterLimit] = useState(initialData.voterLimit || 1);
  const [numberOfWinners, setNumberOfWinners] = useState(initialData.numberOfWinners || 1);

  // Batch upload state
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const templateUrl = "/assets/templates/voters_template.csv";

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
              <h3 className="text-lg font-semibold text-gray-900">Voter Form</h3>
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
                    scope,
                    email,
                    contactNumber,
                    voterLimit,
                    numberOfWinners,
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
                    label="Middle Initial*"
                    type="text"
                    value={voterMiddleInitial}
                    onChange={e => setVoterMiddleInitial(e.target.value)}
                    placeholder="Enter Middle Initial"
                    required
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
                    label="Contact Number*"
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="Enter Contact Number"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scope*
                  </label>
                  <select
                    value={scope}
                    onChange={e => setScope(e.target.value)}
                    className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                    required
                  >
                    <option value="Department 1">Department 1</option>
                    <option value="Department 2">Department 2</option>
                  </select>
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
                    label="Add"
                    className="px-5 py-2.5 text-sm font-medium rounded-lg" // Match the size of the Save button
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