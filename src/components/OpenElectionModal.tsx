import { useState, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";

export type OpenElectionModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    electionId: number;
    isOpen: boolean;
  }) => void;
  initialData?: {
    electionId?: number;
    isOpen?: boolean;
    dateStart?: string;
    dateEnd?: string;
    electionName?: string;
    description?: string;
  };
  disableSave?: boolean;
  title?: string;
  submitLabel?: string;
};

function formatDateTime(dt?: string) {
  if (!dt) return "Not set";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function OpenElectionModal({
  open,
  onClose,
  onSave,
  initialData = {
    electionId: 0,
    isOpen: false,
    dateStart: "",
    dateEnd: "",
  },
  disableSave,
  title = "Open/Close Election",
  submitLabel = "Save",
}: OpenElectionModalProps) {
  const [isOpen, setIsOpen] = useState(initialData.isOpen ?? false);
  const [electionId, setElectionId] = useState(initialData.electionId ?? 0);
  const [dateStart, setDateStart] = useState(initialData.dateStart ?? "");
  const [dateEnd, setDateEnd] = useState(initialData.dateEnd ?? "");

  useEffect(() => {
    if (!open) return;
    setIsOpen(initialData.isOpen ?? false);
    setElectionId(initialData.electionId ?? 0);
    setDateStart(initialData.dateStart ?? "");
    setDateEnd(initialData.dateEnd ?? "");
  }, [open, initialData]);

  if (!open) return null;
  // Use initialData.electionName if provided, else fallback to title
  const electionName = initialData?.electionName || title;
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
              <h3 className="text-lg font-semibold text-gray-900">Open/Close Election</h3>
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
              You can open or close the election. The election will be accessible to voters only during the scheduled period.
            </p>
            {/* Card layout for election info after description */}
            <div className="w-full mb-4">
              <div className="bg-secondary rounded-lg px-6 py-4 flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 text-base">Election Name:</span>
                <span className="text-lg font-bold text-gray-900">{electionName}</span>
              </div>
              <div className="bg-secondary  rounded-lg px-6 py-4 flex items-center justify-between gap-8">
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-700 text-base">Start Date:</span>
                  <span className="text-gray-900 text-base font-medium">{formatDateTime(dateStart)}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-700 text-base">End Date:</span>
                  <span className="text-gray-900 text-base font-medium">{formatDateTime(dateEnd)}</span>
                </div>
              </div>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                onSave({
                  electionId,
                  isOpen,
                });
                onClose();
              }}
              className="grid gap-4 mb-4"
            >
              <div className="col-span-2">
                <label className="block text-base font-medium text-gray-700 mb-1">
                  Election Status*
                </label>
                <select
                  value={isOpen ? "open" : "closed"}
                  onChange={e => setIsOpen(e.target.value === "open")}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  required
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
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
                  label="Submit"
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
