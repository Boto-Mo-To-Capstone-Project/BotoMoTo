import { useState } from "react";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

type CandidatesModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    candidateName: string;
    position: string;
    partylist: string;
    email: string;
    photo?: File | null;
    credentials?: File | null;
  }) => void;
  initialData?: {
    candidateName?: string;
    position?: string;
    partylist?: string;
    email?: string;
    photo?: File | null;
    credentials?: File | null;
  };
  disableSave?: boolean;
};

export function CandidatesModal({
  open,
  onClose,
  onSave,
  initialData = {
    candidateName: "",
    position: "President",
    partylist: "Makabayan",
    email: "",
    photo: null,
    credentials: null,
  },
  disableSave,
}: CandidatesModalProps) {
  const [candidateName, setCandidateName] = useState(initialData.candidateName || "");
  const [position, setPosition] = useState(initialData.position || "President");
  const [partylist, setPartylist] = useState(initialData.partylist || "Makabayan");
  const [email, setEmail] = useState(initialData.email || "");
  const [photo, setPhoto] = useState<File | null>(initialData.photo || null);
  const [credentials, setCredentials] = useState<File | null>(initialData.credentials || null);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/30 backdrop-blur-sm">
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Candidate Form</h3>
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
              Add candidates for certain positions, fill out the fields, and upload credentials (if applicable).
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                onSave({ candidateName, position, partylist, email, photo, credentials });
                onClose();
              }}
              className="grid gap-4 mb-4 grid-cols-2"
            >
              <div className="col-span-2">
                <InputField
                  label="Candidate’s Name*"
                  type="text"
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  placeholder="Enter Candidate Name"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position*
                </label>
                <select
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  required
                >
                  <option value="President">President</option>
                  <option value="Vice President">Vice President</option>
                  {/* Add more positions as needed */}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partylist*
                </label>
                <select
                  value={partylist}
                  onChange={e => setPartylist(e.target.value)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  required
                >
                  <option value="Makabayan">Makabayan</option>
                  <option value="Mabait">Mabait</option>
                  {/* Add more partylists as needed */}
                </select>
              </div>
              <div className="col-span-2">
                <InputField
                  label="Email Address*"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter Email Address"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Photo*
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPhoto(e.target.files?.[0] || null)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm bg-white text-gray-900"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Credentials (PDF)*
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setCredentials(e.target.files?.[0] || null)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm bg-white text-gray-900"
                  required
                />
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
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}